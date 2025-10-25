/**
 * CSRF Protection Utilities
 *
 * This module provides functions to fetch and manage CSRF tokens
 * for protecting API routes against Cross-Site Request Forgery attacks.
 *
 * NextAuth.js v5 provides a CSRF endpoint at /api/auth/csrf that generates
 * secure, session-bound tokens. This utility fetches those tokens and
 * manages them client-side.
 */

interface CsrfTokenResponse {
  csrfToken: string;
}

interface TokenCache {
  token: string | null;
  timestamp: number | null;
}

// In-memory token cache (NOT localStorage for security)
const tokenCache: TokenCache = {
  token: null,
  timestamp: null,
};

// Token cache duration: 30 minutes (aligns with session lifetime)
const CACHE_DURATION_MS = 30 * 60 * 1000;

/**
 * Checks if the cached token is still valid
 */
function isCacheValid(): boolean {
  if (!tokenCache.token || !tokenCache.timestamp) {
    return false;
  }

  const now = Date.now();
  const age = now - tokenCache.timestamp;

  return age < CACHE_DURATION_MS;
}

/**
 * Fetches a fresh CSRF token from NextAuth
 *
 * @returns Promise resolving to CSRF token string
 * @throws Error if fetch fails or response is invalid
 */
export async function getCsrfToken(): Promise<string> {
  // Return cached token if still valid
  if (isCacheValid() && tokenCache.token) {
    return tokenCache.token;
  }

  try {
    // Fetch token from NextAuth endpoint
    const response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'same-origin', // Include cookies
    });

    if (!response.ok) {
      throw new Error(`CSRF token fetch failed: ${response.status}`);
    }

    const data: CsrfTokenResponse = await response.json();

    if (!data.csrfToken || typeof data.csrfToken !== 'string') {
      throw new Error('Invalid CSRF token response format');
    }

    // Update cache
    tokenCache.token = data.csrfToken;
    tokenCache.timestamp = Date.now();

    return data.csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw new Error('Unable to fetch CSRF token. Please refresh the page.');
  }
}

/**
 * Clears the cached CSRF token
 * Call this when session changes or on logout
 */
export function clearCsrfToken(): void {
  tokenCache.token = null;
  tokenCache.timestamp = null;
}

/**
 * Forces a fresh token fetch, bypassing the cache
 * Useful when a 403 response suggests token is invalid
 */
export async function refreshCsrfToken(): Promise<string> {
  clearCsrfToken();
  return getCsrfToken();
}
