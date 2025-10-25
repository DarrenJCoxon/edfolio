'use client';

import { useEffect, useRef } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance for swipe (px)
  edgeThreshold?: number; // Distance from edge to trigger (px)
  enabled?: boolean;
}

/**
 * Hook to detect swipe gestures on touch devices
 *
 * This hook adds touch event listeners to detect horizontal swipe gestures.
 * It distinguishes between scrolling (vertical) and swiping (horizontal) and
 * supports edge detection for opening drawers from screen edges.
 *
 * @param options - Configuration for swipe detection
 * @param options.onSwipeLeft - Callback when user swipes left
 * @param options.onSwipeRight - Callback when user swipes right
 * @param options.threshold - Minimum swipe distance in pixels (default: 50)
 * @param options.edgeThreshold - Max distance from edge to trigger swipe right (default: 20)
 * @param options.enabled - Whether gesture detection is enabled (default: true)
 *
 * @example
 * useSwipeGesture({
 *   onSwipeLeft: () => closeDrawer(),
 *   onSwipeRight: () => openDrawer(),
 *   enabled: isMobile,
 * });
 */
export function useSwipeGesture(options: SwipeGestureOptions): void {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 50,
    edgeThreshold = 20,
    enabled = true,
  } = options;

  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const currentX = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent): void => {
      const touch = e.touches[0];
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      currentX.current = touch.clientX;

      // Only start swipe if touching near left edge (for opening drawer)
      if (onSwipeRight && touch.clientX <= edgeThreshold) {
        isSwiping.current = true;
      }

      // Allow swipe left from anywhere (for closing drawer)
      if (onSwipeLeft) {
        isSwiping.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent): void => {
      if (!isSwiping.current) return;

      const touch = e.touches[0];
      currentX.current = touch.clientX;

      // Calculate horizontal and vertical movement
      const deltaX = currentX.current - startX.current;
      const deltaY = touch.clientY - startY.current;

      // If vertical movement is greater than horizontal, it's a scroll, not swipe
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        isSwiping.current = false;
      }
    };

    const handleTouchEnd = (): void => {
      if (!isSwiping.current) return;

      const deltaX = currentX.current - startX.current;

      // Check if swipe distance meets threshold
      if (Math.abs(deltaX) >= threshold) {
        if (deltaX > 0 && onSwipeRight) {
          // Swipe right
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          // Swipe left
          onSwipeLeft();
        }
      }

      // Reset
      isSwiping.current = false;
      startX.current = 0;
      startY.current = 0;
      currentX.current = 0;
    };

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Cleanup
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onSwipeLeft, onSwipeRight, threshold, edgeThreshold]);
}
