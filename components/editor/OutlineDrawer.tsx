'use client';

import { FileX, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TipTapHeading } from './TipTapEditor';

export interface OutlineDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  headings: TipTapHeading[];
  onHeadingClick: (headingId: string) => void;
}

/**
 * Simple outline drawer using fixed positioning (no portals, no Radix Dialog)
 * Renders table of contents from TipTap's official TableOfContents extension
 */
export function OutlineDrawer({
  isOpen,
  onToggle,
  headings,
  onHeadingClick,
}: OutlineDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="outline-drawer-simple">
      {/* Header */}
      <div className="outline-drawer-header">
        <h3 className="outline-drawer-title">Outline</h3>
        <button
          onClick={onToggle}
          className="outline-drawer-close"
          aria-label="Close outline"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="outline-drawer-content">
        {headings.length === 0 ? (
          <div className="outline-drawer-empty">
            <FileX className="h-12 w-12 text-[var(--muted)]" />
            <p className="text-sm text-[var(--muted)] mt-4">
              No headings in this note
            </p>
          </div>
        ) : (
          <ul className="outline-list">
            {headings.map((heading) => (
              <li
                key={heading.id}
                className={cn(
                  'outline-item',
                  `outline-depth-${heading.depth}`,
                  heading.active && 'outline-item-active'
                )}
                style={{ cursor: 'pointer' }}
                onClick={() => onHeadingClick(heading.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onHeadingClick(heading.id);
                  }
                }}
                aria-current={heading.active ? 'true' : undefined}
              >
                {heading.content}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
