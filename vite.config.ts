import { defineConfig } from 'vite';

// The leaderboard lives on jontryggvi.is. In production the static app is served
// from https://tetris.silentrecorders.io, which is on the WP CORS allowlist, so
// client calls go straight to the API base below. localhost is NOT on that
// allowlist, so in dev we proxy /wp-json through Vite to dodge CORS entirely.
export default defineConfig({
  // Relative base so the build works regardless of the path it's served from.
  base: './',
  server: {
    proxy: {
      '/wp-json': {
        target: 'https://jontryggvi.is',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
