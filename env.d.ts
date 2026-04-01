/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_ADMIN_API_URL?: string;
  readonly VITE_WS_URL?: string;
  readonly VITE_VIRTUAL_CARD_PROVIDER?: string;
  readonly VITE_VIRTUAL_CARD_STATUS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'vite' {
  interface ImportMetaEnv extends ImportMetaEnv {}
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
