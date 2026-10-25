import './style.css';
import { COLS, ROWS, KEY_MAP, COLORS } from './game/constants';
import { Engine, type Stats, type GameSummary } from './game/engine';
import { fetchScores, submitScore, type ScoreRow } from './leaderboard';

const NAME_KEY = 'tetris.playerName';
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} missing`);
  return el as T;
};

const boardEl = $('board');
const nextEl = $('next');
const overlayEl = $('overlay');
const overlayMsg = $('overlay-msg');
const boardWrap = boardEl.parentElement as HTMLElement;

const scoreEl = $('score');
const linesEl = $('lines');
const levelEl = $('level');
const scoresEl = $<HTMLOListElement>('scores');

const startBtn = $<HTMLButtonElement>('btn-start');
const pauseBtn = $<HTMLButtonElement>('btn-pause');

const mplay = $('mplay');
const mPause = $<HTMLButtonElement>('m-pause');
const mExit = $<HTMLButtonElement>('m-exit');
const mHint = $('mplay-hint');
const mScore = $('m-score');
const mLines = $('m-lines');
const mLevel = $('m-level');

// Coarse pointer = the primary input is touch (phones, tablets). This gates the
// fullscreen takeover; hybrid laptops (fine pointer + touchscreen) stay on the
// normal page. The board's touch gestures work regardless.
const isTouch = window.matchMedia('(pointer: coarse)').matches;

const dialog = $<HTMLDialogElement>('gameover');
const dialogForm = $<HTMLFormElement>('gameover-form');
const dialogSummary = $('gameover-summary');
const dialogStatus = $('gameover-status');
const nameInput = $<HTMLInputElement>('player-name');
const skipBtn = $<HTMLButtonElement>('btn-skip');

// --- build the cell grids ---------------------------------------------------
const cells: HTMLElement[] = [];
for (let i = 0; i < COLS * ROWS; i++) {
  const d = document.createElement('div');
  d.className = 'cell';
  boardEl.appendChild(d);
  cells.push(d);
}
const nextCells: HTMLElement[] = [];
for (let i = 0; i < 16; i++) {
  const d = document.createElement('div');
  d.className = 'nx-cell';
  nextEl.appendChild(d);
  nextCells.push(d);
}

// --- engine ----------------------------------------------------------------
let lastSummary: GameSummary | null = null;

const trailEl = $('trail');

const engine = new Engine(cells, nextCells, trailEl, !prefersReducedMotion, {
  onStats: (s: Stats) => {
    scoreEl.textContent = String(s.score);
    linesEl.textContent = String(s.lines);
    levelEl.textContent = String(s.level);
    mScore.textContent = String(s.score);
    mLines.textContent = String(s.lines);
    mLevel.textContent = String(s.level);
  },
  onRunningChange: (running: boolean) => {
    pauseBtn.disabled = !running && !engine.isPaused;
    pauseBtn.textContent = engine.isPaused ? 'Resume' : 'Pause';
    if (running) hideOverlay();
  },
  onGameOver: (summary: GameSummary) => {
    lastSummary = summary;
    exitTouchPlay(); // back to the normal page so the dialog + board are reachable
    showOverlay('Game over');
    pauseBtn.disabled = true;
    openGameOverDialog(summary);
  },
});

// --- overlay ---------------------------------------------------------------
function showOverlay(html: string): void {
  overlayMsg.innerHTML = html;
  overlayEl.hidden = false;
}
function hideOverlay(): void {
  overlayEl.hidden = true;
}

// --- idle demo: landing stack + looping piece + score count-up -------------
// Bottom-of-board sample pile, mapped from the design board's colour letters.
const DEMO_ROWS = [
  '....V.....',
  '...VVV.T..',
  '.S.CC..TT.',
  'SSSCCVVVT.',
  'SWWWCCVTTS',
  'CCWWVVVTSS',
  'CCCWVTTTSS',
];
const DEMO_MAP: Record<string, number> = { S: 3, C: 5, V: 2, T: 1, W: 4 };

function renderDemo(): void {
  boardWrap.classList.remove('playing');
  boardEl.classList.toggle('landing', !prefersReducedMotion);
  cells.forEach((c) => {
    c.className = 'cell';
    c.style.removeProperty('--c');
    c.style.removeProperty('animation-delay');
  });
  const top = ROWS - DEMO_ROWS.length;
  DEMO_ROWS.forEach((row, ri) => {
    row.split('').forEach((ch, ci) => {
      const idx = DEMO_MAP[ch];
      if (!idx) return;
      const cell = cells[(top + ri) * COLS + ci];
      cell.className = 'cell on';
      cell.style.setProperty('--c', COLORS[idx]);
      // bottom rows land first, left to right
      const fromBottom = DEMO_ROWS.length - 1 - ri;
      cell.style.animationDelay = `${(fromBottom * 0.12 + ci * 0.025 + 0.3).toFixed(2)}s`;
    });
  });
  showOverlay('Press <strong>New game</strong> to play');
  countUp(4280);
}

let countRaf = 0;
function countUp(target: number): void {
  cancelAnimationFrame(countRaf);
  if (prefersReducedMotion) {
    scoreEl.textContent = String(target);
    return;
  }
  const start = performance.now();
  const duration = 2200;
  const tick = (now: number): void => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    scoreEl.textContent = String(Math.round(target * eased));
    if (t < 1) countRaf = requestAnimationFrame(tick);
  };
  countRaf = requestAnimationFrame(tick);
}

// --- controls --------------------------------------------------------------
function newGame(): void {
  cancelAnimationFrame(countRaf);
  boardEl.classList.remove('landing');
  boardWrap.classList.add('playing'); // hides the demo fall overlay
  cells.forEach((c) => c.style.removeProperty('animation-delay'));
  hideOverlay();
  pauseBtn.disabled = false;
  pauseBtn.textContent = 'Pause';
  if (isTouch) enterTouchPlay();
  engine.start();
}

function togglePause(): void {
  engine.togglePause();
  const paused = engine.isPaused;
  if (paused) showOverlay('Paused');
  else hideOverlay();
  const label = paused ? 'Resume' : 'Pause';
  pauseBtn.textContent = label;
  mPause.textContent = label;
}

startBtn.addEventListener('click', newGame);
pauseBtn.addEventListener('click', togglePause);
mPause.addEventListener('click', togglePause);
mExit.addEventListener('click', () => {
  engine.stop();
  exitTouchPlay();
  renderDemo();
});

document.addEventListener('keydown', (e) => {
  if (dialog.open) return;
  if (e.key === 'p' || e.key === 'P') {
    if (engine.isPlaying || engine.isPaused) {
      e.preventDefault();
      togglePause();
    }
    return;
  }
  const action = KEY_MAP[e.key];
  if (action && engine.isPlaying) {
    e.preventDefault();
    engine.handle(action);
  }
});

// --- mobile fullscreen + touch gestures ------------------------------------
// While playing on a touch device the board takes over the screen and page
// scroll is locked; gestures on the board drive the pieces.
function sizeBoardToViewport(): void {
  // Reserve room for the HUD bar + padding, then fit 20 rows / 10 cols.
  const reservedY = 96;
  const reservedX = 24;
  const cell = Math.floor(
    Math.min((window.innerHeight - reservedY) / ROWS, (window.innerWidth - reservedX) / COLS),
  );
  document.documentElement.style.setProperty('--cell', `${Math.max(14, cell)}px`);
}

function enterTouchPlay(): void {
  document.body.classList.add('touch-play');
  mplay.hidden = false;
  mPause.textContent = 'Pause';
  mHint.classList.remove('is-faded');
  sizeBoardToViewport();
  window.addEventListener('resize', sizeBoardToViewport);
  window.addEventListener('orientationchange', sizeBoardToViewport);
  // Fade the gesture hint after a few seconds.
  window.setTimeout(() => mHint.classList.add('is-faded'), 3500);
}

function exitTouchPlay(): void {
  if (!document.body.classList.contains('touch-play')) return;
  document.body.classList.remove('touch-play');
  mplay.hidden = true;
  document.documentElement.style.removeProperty('--cell');
  window.removeEventListener('resize', sizeBoardToViewport);
  window.removeEventListener('orientationchange', sizeBoardToViewport);
}

// Gesture recognition on the board: horizontal drag moves column-by-column,
// a tap rotates, a vertical flick drops (down) or rotates the other way (up).
let touchId: number | null = null;
let startX = 0;
let startY = 0;
let lastStepX = 0;
let startTime = 0;
let movedCols = 0;

function cellStep(): number {
  const rect = cells[0].getBoundingClientRect();
  return rect.width > 0 ? rect.width + 2 : 28;
}

boardWrap.addEventListener(
  'touchstart',
  (e: TouchEvent) => {
    if (!engine.isPlaying || touchId !== null) return;
    const t = e.changedTouches[0];
    touchId = t.identifier;
    startX = lastStepX = t.clientX;
    startY = t.clientY;
    startTime = performance.now();
    movedCols = 0;
    e.preventDefault();
  },
  { passive: false },
);

boardWrap.addEventListener(
  'touchmove',
  (e: TouchEvent) => {
    if (touchId === null || !engine.isPlaying) return;
    const t = findTouch(e.changedTouches);
    if (!t) return;
    e.preventDefault();
    const step = cellStep();
    while (t.clientX - lastStepX >= step) {
      engine.handle('right');
      lastStepX += step;
      movedCols++;
    }
    while (lastStepX - t.clientX >= step) {
      engine.handle('left');
      lastStepX -= step;
      movedCols++;
    }
  },
  { passive: false },
);

boardWrap.addEventListener(
  'touchend',
  (e: TouchEvent) => {
    if (touchId === null) return;
    const t = findTouch(e.changedTouches);
    touchId = null;
    if (!t || !engine.isPlaying) return;
    e.preventDefault();
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = performance.now() - startTime;
    const TAP = 14;
    const SWIPE = 28;
    if (movedCols === 0 && Math.abs(dx) < TAP && Math.abs(dy) < TAP && dt < 300) {
      engine.handle('rotateR'); // tap
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SWIPE) {
      engine.handle(dy > 0 ? 'drop' : 'rotateL'); // swipe down = drop, up = rotate other way
    }
  },
  { passive: false },
);

boardWrap.addEventListener('touchcancel', () => {
  touchId = null;
});

function findTouch(list: TouchList): Touch | null {
  for (let i = 0; i < list.length; i++) {
    if (list[i].identifier === touchId) return list[i];
  }
  return null;
}

// --- leaderboard -----------------------------------------------------------
let youRank: number | null = null;

function renderScores(rows: ScoreRow[]): void {
  scoresEl.innerHTML = '';
  if (rows.length === 0) {
    const li = document.createElement('li');
    li.className = 'scores-empty';
    li.textContent = 'No scores yet — be the first.';
    scoresEl.appendChild(li);
    return;
  }
  rows.forEach((row, i) => {
    const li = document.createElement('li');
    if (youRank !== null && row.rank === youRank) li.classList.add('is-you');
    li.style.animationDelay = `${1 + i * 0.1}s`;
    li.innerHTML =
      `<span class="s-rank">${row.rank}</span>` +
      `<span class="s-name"></span>` +
      `<span class="s-score">${row.score.toLocaleString('en-US')}</span>`;
    (li.querySelector('.s-name') as HTMLElement).textContent = row.player_name;
    scoresEl.appendChild(li);
  });
}

async function loadScores(): Promise<void> {
  try {
    const rows = await fetchScores(10);
    renderScores(rows);
  } catch {
    scoresEl.innerHTML = '<li class="scores-empty">High scores unavailable right now.</li>';
  }
}

// --- game over / submission ------------------------------------------------
function openGameOverDialog(summary: GameSummary): void {
  dialogSummary.textContent =
    `${summary.score.toLocaleString('en-US')} points · ${summary.lines} lines · level ${summary.level}`;
  dialogStatus.textContent = '';
  dialogStatus.classList.remove('is-error');
  nameInput.value = localStorage.getItem(NAME_KEY) ?? '';
  nameInput.disabled = false;
  const submitBtn = dialogForm.querySelector('#btn-submit') as HTMLButtonElement;
  submitBtn.disabled = false;
  dialog.showModal();
  nameInput.focus();
}

dialogForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!lastSummary) return;
  const name = nameInput.value.trim();
  if (!name) return;

  const submitBtn = dialogForm.querySelector('#btn-submit') as HTMLButtonElement;
  submitBtn.disabled = true;
  nameInput.disabled = true;
  dialogStatus.classList.remove('is-error');
  dialogStatus.textContent = 'Submitting…';

  localStorage.setItem(NAME_KEY, name);
  const result = await submitScore({
    player_name: name,
    score: lastSummary.score,
    lines: lastSummary.lines,
    level: lastSummary.level,
    duration_s: lastSummary.durationS,
  });

  if (result.ok) {
    youRank = result.rank;
    dialogStatus.textContent = `Submitted — you're #${result.rank}!`;
    await loadScores();
    setTimeout(() => dialog.close(), 900);
  } else {
    dialogStatus.classList.add('is-error');
    dialogStatus.textContent = result.message;
    submitBtn.disabled = false;
    nameInput.disabled = false;
  }
});

skipBtn.addEventListener('click', () => dialog.close());

// --- boot ------------------------------------------------------------------
renderDemo();
loadScores();
