'use client';

import { useState } from 'react';
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

export interface DeleteConfirmDialogProps {
  type: 'folio' | 'folder' | 'note';
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  contentCount?: { noteCount: number; folderCount: number };
}

export function DeleteConfirmDialog({
  type,
  itemName,
  isOpen,
  onClose,
  onConfirm,
  contentCount,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const hasContents = contentCount &&
    (contentCount.noteCount > 0 || contentCount.folderCount > 0);

  const handleConfirm = async () => {
    // Require checkbox if folder has contents
    if (hasContents && !confirmChecked) {
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
      setConfirmChecked(false); // Reset checkbox
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'folio':
        return `This will permanently delete "${itemName}" and all its folders and notes. This action cannot be undone.`;
      case 'folder':
        return `This will permanently delete "${itemName}" and all its contents. This action cannot be undone.`;
      case 'note':
        return `This will permanently delete "${itemName}". This action cannot be undone.`;
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {type.charAt(0).toUpperCase() + type.slice(1)}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {getDescription()}
            {hasContents && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="font-semibold text-destructive mb-2">
                  ⚠️ Warning: This folder contains:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {contentCount && contentCount.noteCount > 0 && (
                    <li>
                      {contentCount.noteCount} note{contentCount.noteCount !== 1 ? 's' : ''}
                    </li>
                  )}
                  {contentCount && contentCount.folderCount > 0 && (
                    <li>
                      {contentCount.folderCount} subfolder{contentCount.folderCount !== 1 ? 's' : ''}
                    </li>
                  )}
                </ul>
                <p className="mt-2 text-sm font-semibold">
                  All contents will be permanently deleted.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {hasContents && (
          <div className="flex items-center space-x-2 px-6">
            <input
              type="checkbox"
              id="confirm-delete"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label
              htmlFor="confirm-delete"
              className="text-sm cursor-pointer select-none"
            >
              I understand this cannot be undone
            </label>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting || (hasContents && !confirmChecked)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
