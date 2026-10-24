/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface ImportMetaEnv {
  /** Where the API is. Same origin in development, through the Vite proxy. */
  readonly VITE_API_BASE_URL: string;
  /** Names the school when the host has no subdomain to read it from. */
  readonly VITE_SCHOOL_SUBDOMAIN?: string;
  readonly VITE_AI_PLATFORM_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
