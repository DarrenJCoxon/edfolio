'use client';

import { Check, Loader2, AlertCircle } from 'lucide-react';
import { SaveStatus } from '@/lib/hooks/useAutoSave';
import { cn } from '@/lib/utils';

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
        'text-sm text-[var(--muted)]',
        'transition-opacity duration-200',
        className
      )}
      aria-live="polite"
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Saving...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <Check className="h-4 w-4 text-[var(--accent)]" />
          <span>Saved</span>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4 text-[var(--destructive)]" />
          <span>Error saving{error ? `: ${error.message}` : ''}</span>
        </>
      )}
    </div>
  );
}
