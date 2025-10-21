'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import type { UnpublishConfirmDialogProps } from '@/types';

/**
 * UnpublishConfirmDialog Component
 *
 * Shows a confirmation dialog before unpublishing a page.
 * Prevents accidental unpublishing by requiring explicit confirmation.
 */
export function UnpublishConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  publicUrl,
}: UnpublishConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--destructive)]" />
            <AlertDialogTitle>Unpublish Page?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            This will make your page inaccessible to anyone with the link.
            {publicUrl && (
              <>
                {' '}
                The public URL{' '}
                <span className="font-mono text-sm text-[var(--foreground)]">
                  {publicUrl}
                </span>{' '}
                will return a 404 error.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90"
          >
            Unpublish
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
