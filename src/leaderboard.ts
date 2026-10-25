// Client for the jontryggvi.is Tetris leaderboard.
//
// Flow for a submission: GET a single-use nonce, compute an HMAC-SHA256
// signature over the pipe-joined fields + nonce, then POST. The signing secret
// is baked into the bundle (see .env) so this is deterrence, not real security.

const API_BASE = import.meta.env.VITE_API_BASE ?? '';
const SECRET = decodeSecret(import.meta.env.VITE_TETRIS_SECRET_B64);

function decodeSecret(b64: string | undefined): string {
  if (!b64) return '';
  try {
    // atob → bytes → UTF-8 string, so non-ASCII bytes survive intact.
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

const url = (path: string): string => `${API_BASE}/wp-json/jt/v1${path}`;

export interface ScoreRow {
  rank: number;
  player_name: string;
  score: number;
  lines: number;
  level: number;
  duration_s: number;
  date: string;
}

export interface SubmitPayload {
  player_name: string;
  score: number;
  lines: number;
  level: number;
  duration_s: number;
}

export type SubmitResult =
  | { ok: true; id: number; rank: number }
  | { ok: false; status: number; message: string };

export async function fetchScores(limit = 10): Promise<ScoreRow[]> {
  const res = await fetch(url(`/tetris/scores?limit=${limit}`), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`scores: HTTP ${res.status}`);
  return res.json();
}

async function fetchNonce(): Promise<string> {
  const res = await fetch(url('/tetris/nonce'), { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`nonce: HTTP ${res.status}`);
  const data = (await res.json()) as { nonce: string; ttl: number };
  return data.nonce;
}

// HMAC-SHA256(message, secret) as lowercase hex, via Web Crypto.
async function sign(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const ERROR_BY_STATUS: Record<number, string> = {
  400: 'Nonce expired or already used — try again.',
  401: 'Signature rejected.',
  422: 'Score looked implausible and was rejected.',
  429: 'Too many submissions — wait a moment and try again.',
};

export async function submitScore(payload: SubmitPayload): Promise<SubmitResult> {
  try {
    const nonce = await fetchNonce();
    const message = [
      payload.player_name,
      payload.score,
      payload.lines,
      payload.level,
      payload.duration_s,
      nonce,
    ].join('|');
    const sig = await sign(message);

    const res = await fetch(url('/tetris/scores'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...payload, nonce, sig }),
    });

    if (res.status === 201) {
      const data = (await res.json()) as { id: number; rank: number };
      return { ok: true, id: data.id, rank: data.rank };
    }
    return {
      ok: false,
      status: res.status,
      message: ERROR_BY_STATUS[res.status] ?? `Submission failed (HTTP ${res.status}).`,
    };
  } catch (err) {
    return { ok: false, status: 0, message: `Network error: ${(err as Error).message}` };
  }
}
