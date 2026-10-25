/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_TETRIS_SECRET_B64?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
