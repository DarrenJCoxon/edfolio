'use client';

import { Sparkles, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HighlightMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onOptionClick: (option: 'rephrase' | 'summarize' | 'fix-grammar') => void;
}

/**
 * HighlightMenu component displays a contextual menu when text is selected
 * in the editor. Currently shows disabled placeholder buttons for future AI features.
 *
 * Features:
 * - Appears above/below text selection
 * - Smart positioning to avoid viewport overflow
 * - Three disabled buttons: Rephrase, Summarize, Fix Grammar
 * - Tooltips indicate when features will be available
 */
export function HighlightMenu({
  isVisible,
  position,
  onOptionClick,
}: HighlightMenuProps) {
  if (!isVisible) return null;

  return (
    <div
      className="highlight-menu"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      role="toolbar"
      aria-label="Text transformation options"
    >
      <button
        className={cn('highlight-menu-button')}
        onClick={() => onOptionClick('rephrase')}
        disabled
        title="Coming in Story 2.3"
        aria-label="Rephrase selected text (coming soon)"
        type="button"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span>Rephrase</span>
      </button>

      <button
        className={cn('highlight-menu-button')}
        onClick={() => onOptionClick('summarize')}
        disabled
        title="Coming in Story 2.4"
        aria-label="Summarize selected text (coming soon)"
        type="button"
      >
        <FileText className="h-4 w-4" aria-hidden="true" />
        <span>Summarize</span>
      </button>

      <button
        className={cn('highlight-menu-button')}
        onClick={() => onOptionClick('fix-grammar')}
        disabled
        title="Coming in Story 2.5"
        aria-label="Fix grammar in selected text (coming soon)"
        type="button"
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        <span>Fix Grammar</span>
      </button>
    </div>
  );
}
