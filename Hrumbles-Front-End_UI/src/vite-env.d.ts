
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_KEY: string;
  readonly VITE_API_URL: string;
  readonly VITE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Process env for environments that don't support import.meta
declare namespace NodeJS {
  interface ProcessEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_KEY: string;
    readonly VITE_API_URL: string;
    readonly VITE_API_KEY: string;
  }
}
