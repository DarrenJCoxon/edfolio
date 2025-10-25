'use client';

import { useState, useCallback, useEffect } from 'react';
import { calculateMenuPosition } from '@/lib/editor/menu-positioning';

export interface UseTextSelectionOptions {
  activeNoteId: string | null;
}

export interface UseTextSelectionReturn {
  selectedText: string;
  showHighlightMenu: boolean;
  menuPosition: { x: number; y: number };
  handleSelectionChange: (text: string, hasSelection: boolean) => void;
}

export function useTextSelection({
  activeNoteId,
}: UseTextSelectionOptions): UseTextSelectionReturn {
  const [selectedText, setSelectedText] = useState('');
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Handle text selection changes
  const handleSelectionChange = useCallback((text: string, hasSelection: boolean) => {
    if (hasSelection && text.trim().length > 0) {
      setSelectedText(text);
      // Calculate menu position based on selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const position = calculateMenuPosition(
          {
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          },
          { width: 280, height: 60 } // Menu dimensions
        );

        setMenuPosition(position);
        setShowHighlightMenu(true);
      }
    } else {
      setShowHighlightMenu(false);
      setSelectedText('');
    }
  }, []);

  // Hide highlight menu when switching notes
  useEffect(() => {
    setShowHighlightMenu(false);
  }, [activeNoteId]);

  // Handle click outside menu to dismiss
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't hide if clicking on the menu itself or its children
      if (target.closest('.highlight-menu')) {
        return;
      }

      // Hide menu when clicking outside
      setShowHighlightMenu(false);
    };

    if (showHighlightMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showHighlightMenu]);

  return {
    selectedText,
    showHighlightMenu,
    menuPosition,
    handleSelectionChange,
  };
}
