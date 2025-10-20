'use client';

import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SaveStatus } from '@/lib/hooks/useAutoSave';

export interface SaveIndicatorProps {
  status: SaveStatus;
  error?: Error | null;
  className?: string;
}

export function SaveIndicator({ status, error, className }: SaveIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-[var(--spacing-xs)]',
        'text-sm transition-opacity duration-200',
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />
          <span className="text-[var(--muted)]">Saving...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <Check className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-[var(--accent)]">Saved</span>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4 text-[var(--destructive)]" />
          <span className="text-[var(--destructive)]">
            {error?.message || 'Error saving'}
          </span>
        </>
      )}
    </div>
  );
}
