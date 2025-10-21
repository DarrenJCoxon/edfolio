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
import { Loader2 } from 'lucide-react';

export interface RephrasePreviewProps {
  isOpen: boolean;
  originalText: string;
  rephrasedText: string;
  onAccept: () => void;
  onReject: () => void;
  isApplying: boolean;
}

/**
 * RephrasePreview component displays a modal dialog showing the original and
 * rephrased text side-by-side for user review.
 *
 * Features:
 * - Two-column comparison view
 * - Accept/Reject actions
 * - Loading state during apply
 * - Keyboard support (Enter to accept, Escape to reject)
 */
export function RephrasePreview({
  isOpen,
  originalText,
  rephrasedText,
  onAccept,
  onReject,
  isApplying,
}: RephrasePreviewProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isApplying && onReject()}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Review Suggested Rephrase</DialogTitle>
          <DialogDescription>
            Compare the original and rephrased text. Accept to replace, or
            reject to keep the original.
          </DialogDescription>
        </DialogHeader>

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

          {/* Rephrased Text Column */}
          <div>
            <h3 className="text-sm font-medium mb-[var(--spacing-sm)] text-[var(--accent)]">
              Suggested
            </h3>
            <div className="rephrase-preview-column rephrase-preview-suggested">
              {rephrasedText}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-[var(--spacing-lg)]">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isApplying}
            type="button"
          >
            Reject
          </Button>
          <Button onClick={onAccept} disabled={isApplying} type="button">
            {isApplying && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
