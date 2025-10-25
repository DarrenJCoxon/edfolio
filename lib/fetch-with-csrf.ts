/**
 * Fetch Wrapper with Automatic CSRF Token Injection
 *
 * This module provides a drop-in replacement for the native fetch API
 * that automatically includes CSRF tokens in request headers.
 *
 * Usage:
 * const response = await fetchWithCsrf('/api/notes', {
 *   method: 'POST',
 *   body: JSON.stringify({ title: 'My Note' }),
 * });
 */

import { getCsrfToken, refreshCsrfToken } from './csrf';

// Methods that require CSRF protection
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Determines if a request needs CSRF protection
 */
function needsCsrfToken(url: string, options?: RequestInit): boolean {
  // Check if method requires protection
  const method = options?.method?.toUpperCase() || 'GET';
  if (!PROTECTED_METHODS.includes(method)) {
    return false;
  }

  // Skip CSRF for external URLs (they're not CSRF-vulnerable in same way)
  try {
    const urlObj = new URL(url, window.location.origin);
    if (urlObj.origin !== window.location.origin) {
      return false;
    }
  } catch {
    // Relative URL, needs protection
    return true;
  }

  // Skip CSRF for public endpoints
  if (url.includes('/api/public/')) {
    return false;
  }

  // Skip CSRF for NextAuth endpoints (already protected)
  if (url.includes('/api/auth/')) {
    return false;
  }

  return true;
}

/**
 * Fetch with automatic CSRF token injection
 *
 * This function wraps the native fetch API and automatically:
 * 1. Fetches CSRF token if needed
 * 2. Injects token into X-CSRF-Token header
 * 3. Retries once with fresh token on 403 response
 * 4. Falls back to regular fetch if token fetch fails
 *
 * @param url - Request URL
 * @param options - Fetch options (same as native fetch)
 * @returns Promise resolving to Response
 */
export async function fetchWithCsrf(
  url: string,
  options?: RequestInit
): Promise<Response> {
  // Check if this request needs CSRF protection
  if (!needsCsrfToken(url, options)) {
    return fetch(url, options);
  }

  try {
    // Fetch CSRF token
    const csrfToken = await getCsrfToken();

    // Clone options to avoid mutating original
    const csrfOptions: RequestInit = {
      ...options,
      headers: {
        ...options?.headers,
        'X-CSRF-Token': csrfToken,
      } as HeadersInit,
      credentials: options?.credentials || 'same-origin',
    };

    // Make request with CSRF token
    let response = await fetch(url, csrfOptions);

    // If we get 403, token might be stale - try refreshing once
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));

      // Check if it's a CSRF error specifically
      if (errorData.code === 'CSRF_TOKEN_INVALID') {
        console.warn('CSRF token invalid, refreshing and retrying once...');

        // Refresh token
        const newToken = await refreshCsrfToken();

        // Retry with new token
        const retryOptions: RequestInit = {
          ...csrfOptions,
          headers: {
            ...csrfOptions.headers,
            'X-CSRF-Token': newToken,
          },
        };

        response = await fetch(url, retryOptions);
      }
    }

    return response;
  } catch (error) {
    // If CSRF token fetch fails, fall back to regular fetch
    // This prevents the app from becoming completely unusable
    console.error('CSRF token fetch failed, falling back to regular fetch:', error);
    return fetch(url, options);
  }
}

/**
 * Convenience wrapper for POST requests with CSRF
 */
export async function postWithCsrf(
  url: string,
  data: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<Response> {
  return fetchWithCsrf(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * Convenience wrapper for PATCH requests with CSRF
 */
export async function patchWithCsrf(
  url: string,
  data: unknown,
  options?: Omit<RequestInit, 'method' | 'body'>
): Promise<Response> {
  return fetchWithCsrf(url, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * Convenience wrapper for DELETE requests with CSRF
 */
export async function deleteWithCsrf(
  url: string,
  options?: Omit<RequestInit, 'method'>
): Promise<Response> {
  return fetchWithCsrf(url, {
    ...options,
    method: 'DELETE',
  });
}
