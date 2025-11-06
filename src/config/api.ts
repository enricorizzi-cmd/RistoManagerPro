/**
 * API Configuration
 * Uses environment variables in production, falls back to localhost in development
 */
const getApiBaseUrl = () => {
  // Explicit environment variable takes precedence
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // In production, use same origin (Render serves both frontend and backend)
  if (import.meta.env.PROD) {
    return window.location.origin;
  }

  // Development fallback
  return 'http://localhost:4000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;

// Log API configuration for debugging
if (import.meta.env.DEV) {
  console.log('[API Config]', {
    mode: import.meta.env.MODE,
    prod: import.meta.env.PROD,
    viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
    apiBaseUrl: API_BASE_URL,
    apiUrl: API_URL,
    windowOrigin:
      typeof window !== 'undefined' ? window.location.origin : 'N/A',
  });
}
