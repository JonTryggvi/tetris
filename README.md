# Tetris

A browser Tetris for [jontryggvi.is](https://jontryggvi.is), deployed as a static
build to `tetris.silentrecorders.io`. TypeScript + [Vite](https://vite.dev); no
framework, no runtime server. Scores persist to the WordPress leaderboard API on
jontryggvi.is.

## Develop

```bash
cp .env.example .env   # then fill VITE_TETRIS_SECRET_B64 (see below)
npm install
npm run dev            # http://localhost:5173
```

`localhost` is **not** on the WordPress CORS allowlist, so the Vite dev server
proxies `/wp-json/*` through to `https://jontryggvi.is` (see `vite.config.ts`).
Leave `VITE_API_BASE` empty in dev so calls go through that proxy.

## Build

```bash
npm run build          # type-checks, then emits a static dist/
npm run preview        # serve dist/ locally
```

For a production build set `VITE_API_BASE=https://jontryggvi.is` in `.env` so the
static bundle calls the API directly (the deployed origin
`tetris.silentrecorders.io` **is** on the CORS allowlist).

## Leaderboard

Runtime, client-side calls to `https://jontryggvi.is/wp-json/jt/v1`:

- `GET /tetris/scores?limit=N` → ranked rows.
- Submit: `GET /tetris/nonce` → sign → `POST /tetris/scores`.
  `sig = HMAC-SHA256("player_name|score|lines|level|duration_s|nonce", secret)`
  as hex, computed with Web Crypto (`src/leaderboard.ts`).

The signing secret is the WordPress option `jt_tetris_secret`, base64-encoded into
`VITE_TETRIS_SECRET_B64` (base64 keeps dotenv from mangling its `$`/`#`/backtick
bytes). Retrieve it with:

```bash
ssh … "wp option get jt_tetris_secret" | base64
```

**Honest caveat:** this is a static app, so the secret ends up in the bundle and
is extractable. The nonce + HMAC + server-side rate-limit and plausibility checks
only raise the bar against casual forgery — submitted scores can't be fully
trusted.

## Deploy

Static nginx host (droplet alias `silent-recorder`), webroot
`/var/www/tetris.silentrecorders.io`. Back up the current webroot, then
`rsync -az --delete dist/` to it.

## Structure

```
index.html            shared header/footer shell + game markup
src/
  main.ts             wiring: grid build, idle demo, input, dialog, leaderboard
  style.css           tokens + shared shell + board styles (motion behind
                      prefers-reduced-motion)
  leaderboard.ts      scores fetch + nonce/HMAC submit
  game/
    constants.ts      dims, shapes, colours, scoring, key map
    piece.ts          tetromino + rotation
    board.ts          grid, collision, line clears, gravity step
    engine.ts         loop, scoring, rendering to the DOM grid
```
