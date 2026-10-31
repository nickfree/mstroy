export const apiBaseUrl =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:3000' : '');
export const apiRequestTimeoutMs = 15_000;
