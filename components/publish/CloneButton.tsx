'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { toast } from 'sonner';
import { CloneButtonProps } from '@/types';

/**
 * Button to clone a page to user's vault
 * Requires edit permission (via access token or ownership)
 */
export function CloneButton({
  noteId,
  noteTitle,
  accessToken,
}: CloneButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const handleClone = async () => {
    setIsCloning(true);

    try {
      const response = await fetch(`/api/notes/${noteId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: accessToken || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clone page');
      }

      const result = await response.json();

      toast.success('Page cloned successfully!');
      setIsOpen(false);

      // Redirect to the new note in editor
      router.push(result.data.redirectUrl);
    } catch (error) {
      console.error('Clone error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to clone page'
      );
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Copy className="h-4 w-4" />
        Clone to My Vault
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clone this page?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will create a private copy of &quot;{noteTitle}&quot; in
                your vault that you can edit independently.
              </p>
              <p className="text-sm text-muted">
                The original page will not be affected by changes you make to
                your copy.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCloning}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClone} disabled={isCloning}>
              {isCloning ? 'Cloning...' : 'Clone Page'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
