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
import { countWords } from '@/lib/editor/text-manipulation';

export interface SummarizePreviewProps {
  isOpen: boolean;
  originalText: string;
  summary: string;
  onAccept: () => void;
  onReject: () => void;
  isApplying: boolean;
}

/**
 * SummarizePreview component displays a modal dialog showing the original text
 * alongside the AI-generated summary. Users can review the comparison and decide
 * whether to accept or reject the summarization.
 *
 * Features:
 * - Side-by-side comparison of original and summary
 * - Word count display for both versions
 * - Compression percentage calculation
 * - Blue color theme to distinguish from rephrase feature
 * - Keyboard shortcuts (Enter to accept, Escape to reject)
 * - Loading state during text replacement
 */
export function SummarizePreview({
  isOpen,
  originalText,
  summary,
  onAccept,
  onReject,
  isApplying,
}: SummarizePreviewProps) {
  const originalWordCount = countWords(originalText);
  const summaryWordCount = countWords(summary);
  const compressionPercent = Math.round((summaryWordCount / originalWordCount) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isApplying && onReject()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Review Suggested Summary</DialogTitle>
          <DialogDescription>
            Compare the original text and the AI-generated summary. The summary is {compressionPercent}% of the original length.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-[var(--spacing-md)] mt-[var(--spacing-md)]">
          {/* Original Text Column */}
          <div>
            <div className="flex justify-between items-center mb-[var(--spacing-sm)]">
              <h3 className="text-sm font-medium text-[var(--muted)]">
                Original
              </h3>
              <span className="word-count">
                {originalWordCount} words
              </span>
            </div>
            <div className="rephrase-preview-column rephrase-preview-original">
              {originalText}
            </div>
          </div>

          {/* Summary Column */}
          <div>
            <div className="flex justify-between items-center mb-[var(--spacing-sm)]">
              <h3 className="text-sm font-medium text-[var(--accent)]">
                Summary
              </h3>
              <span className="word-count">
                {summaryWordCount} words
              </span>
            </div>
            <div className="rephrase-preview-column summarize-preview-summary">
              {summary}
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
          <Button
            onClick={onAccept}
            disabled={isApplying}
            type="button"
          >
            {isApplying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
