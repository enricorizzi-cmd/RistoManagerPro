/**
 * API Configuration
 * Uses environment variables in production, falls back to localhost in development
 */
export const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD 
    ? window.location.origin 
    : 'http://localhost:4000');

export const API_URL = `${API_BASE_URL}/api`;

