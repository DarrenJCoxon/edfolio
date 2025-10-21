/**
 * Menu Positioning Utilities
 *
 * Calculates optimal position for the highlight menu to avoid viewport overflow.
 * Provides smart positioning that adjusts based on available space.
 */

export interface MenuRect {
  width: number;
  height: number;
}

export interface SelectionRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface MenuPosition {
  x: number;
  y: number;
}

// Constants for menu positioning
const VIEWPORT_PADDING = 16; // px from viewport edge
const MENU_OFFSET = 8; // px gap between selection and menu

/**
 * Calculate optimal position for the highlight menu based on text selection.
 *
 * Strategy:
 * 1. Default: Above selection, horizontally centered
 * 2. If overflow top: Flip to below selection
 * 3. If overflow left/right: Adjust to stay within viewport
 * 4. If overflow bottom (after flip): Position at top of viewport
 *
 * @param selectionRect - Bounding rect of the text selection
 * @param menuRect - Dimensions of the menu (width, height)
 * @returns Position coordinates { x, y } for fixed positioning
 */
export function calculateMenuPosition(
  selectionRect: SelectionRect,
  menuRect: MenuRect
): MenuPosition {
  // Default position: above selection, centered horizontally
  let x = selectionRect.left + selectionRect.width / 2 - menuRect.width / 2;
  let y = selectionRect.top - menuRect.height - MENU_OFFSET;

  // Check horizontal overflow
  const viewportWidth = window.innerWidth;

  if (x < VIEWPORT_PADDING) {
    // Align to left edge with padding
    x = VIEWPORT_PADDING;
  } else if (x + menuRect.width > viewportWidth - VIEWPORT_PADDING) {
    // Align to right edge with padding
    x = viewportWidth - menuRect.width - VIEWPORT_PADDING;
  }

  // Check vertical overflow at top
  if (y < VIEWPORT_PADDING) {
    // Flip to below selection
    y = selectionRect.bottom + MENU_OFFSET;
  }

  // Check if flipped position would overflow bottom
  const viewportHeight = window.innerHeight;
  if (y + menuRect.height > viewportHeight - VIEWPORT_PADDING) {
    // Position at bottom of viewport with padding
    y = viewportHeight - menuRect.height - VIEWPORT_PADDING;
  }

  return { x, y };
}

/**
 * Check if a menu at the given position would be off-screen.
 * Useful for testing and debugging positioning logic.
 *
 * @param position - Menu position { x, y }
 * @param menuRect - Menu dimensions { width, height }
 * @returns True if menu would be partially or fully off-screen
 */
export function isMenuOffscreen(
  position: MenuPosition,
  menuRect: MenuRect
): boolean {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Check all four edges
  const offscreenLeft = position.x < 0;
  const offscreenRight = position.x + menuRect.width > viewportWidth;
  const offscreenTop = position.y < 0;
  const offscreenBottom = position.y + menuRect.height > viewportHeight;

  return offscreenLeft || offscreenRight || offscreenTop || offscreenBottom;
}
