'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle } from 'lucide-react';
import type { GrammarFixPreviewProps } from '@/types';

export function GrammarFixPreview({
  isOpen,
  originalText,
  correctedText,
  hasChanges,
  onAccept,
  onReject,
  isApplying,
}: GrammarFixPreviewProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isApplying && onReject()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Review Grammar & Spelling Corrections</DialogTitle>
          <DialogDescription>
            {hasChanges
              ? 'Compare the original and corrected text'
              : 'No grammar or spelling errors detected'}
          </DialogDescription>
        </DialogHeader>

        {hasChanges ? (
          // Two-column comparison view
          <div className="grid grid-cols-2 gap-[var(--spacing-md)] mt-[var(--spacing-md)]">
            {/* Original Text Column */}
            <div>
              <h3 className="text-sm font-medium mb-[var(--spacing-sm)] text-[var(--muted)]">
                Original
              </h3>
              <div className="rephrase-preview-column rephrase-preview-original">
                {originalText}
              </div>
            </div>

            {/* Corrected Text Column */}
            <div>
              <h3 className="text-sm font-medium mb-[var(--spacing-sm)] text-[var(--accent)]">
                Corrected
              </h3>
              <div className="rephrase-preview-column grammar-fix-preview-corrected">
                {correctedText}
              </div>
            </div>
          </div>
        ) : (
          // No changes message
          <div className="no-changes-message">
            <CheckCircle className="h-12 w-12 mx-auto mb-[var(--spacing-md)] text-[var(--accent)]" />
            <p className="text-base font-medium text-[var(--foreground)]">
              Your text looks great!
            </p>
            <p className="text-sm text-[var(--muted)] mt-[var(--spacing-xs)]">
              No grammar or spelling errors were found.
            </p>
          </div>
        )}

        <DialogFooter className="mt-[var(--spacing-lg)]">
          {hasChanges ? (
            <>
              <Button
                variant="outline"
                onClick={onReject}
                disabled={isApplying}
                type="button"
              >
                Reject
              </Button>
              <Button
                onClick={onAccept}
                disabled={isApplying}
                type="button"
              >
                {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accept
              </Button>
            </>
          ) : (
            <Button onClick={onReject} type="button">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
