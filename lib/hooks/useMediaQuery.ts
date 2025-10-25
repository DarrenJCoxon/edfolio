'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect if a media query matches
 *
 * This hook safely handles SSR by returning false on the server and updating
 * on the client. It automatically updates when the viewport size changes.
 *
 * @param query - CSS media query string (e.g., '(max-width: 768px)')
 * @returns boolean indicating if query matches
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)');
 */
export function useMediaQuery(query: string): boolean {
  // SSR: Default to false
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if window is defined (client-side)
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQuery.matches);

    // Define listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add listener (newer API)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(listener);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      } else {
        mediaQuery.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

/**
 * Convenience hook to detect mobile viewport (< 768px)
 *
 * @returns true if viewport width is less than 768px
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

/**
 * Convenience hook to detect tablet viewport (768px - 1023px)
 *
 * @returns true if viewport width is between 768px and 1023px
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/**
 * Convenience hook to detect desktop viewport (>= 1024px)
 *
 * @returns true if viewport width is 1024px or greater
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
