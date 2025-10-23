'use client';

import { useState } from 'react';
import { MoreVertical, Copy, ExternalLink, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useRouter } from 'next/navigation';
import { useFoliosStore } from '@/lib/stores/folios-store';

interface SharedDocumentContextMenuProps {
  noteId: string;
  pageTitle: string;
  slug: string;
  folioId: string;
  onRemove?: () => void;
}

export function SharedDocumentContextMenu({
  noteId,
  pageTitle,
  slug,
  folioId,
  onRemove,
}: SharedDocumentContextMenuProps) {
  const router = useRouter();
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  // Access store functions to open notes in editor
  const setActiveNote = useFoliosStore((state) => state.setActiveNote);
  const setActiveFolio = useFoliosStore((state) => state.setActiveFolio);
  const openTab = useFoliosStore((state) => state.openTab);

  const handleOpen = () => {
    // Switch to the owner's folio so the note data is available
    setActiveFolio(folioId);
    // Open the shared document in the editor
    setActiveNote(noteId);
    openTab(noteId, pageTitle);
  };

  const handleClone = async () => {
    setIsCloning(true);
    try {
      const response = await fetch(`/api/notes/${noteId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clone page');
      }

      const { data } = await response.json();
      toast.success('Page cloned successfully');

      // Optionally navigate to the cloned page
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      }
    } catch (error) {
      console.error('Clone error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to clone page'
      );
    } finally {
      setIsCloning(false);
      setShowCloneDialog(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-muted"
            aria-label="More options"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleOpen}>
            <ExternalLink className="mr-2 h-4 w-4" />
            <span>Open</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowCloneDialog(true);
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            <span>Clone to My Folio</span>
          </DropdownMenuItem>
          {onRemove && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="text-destructive focus:text-destructive"
            >
              <X className="mr-2 h-4 w-4" />
              <span>Remove from list</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showCloneDialog} onOpenChange={setShowCloneDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clone &quot;{pageTitle}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create an independent copy in your folio. Changes to the
              clone won&apos;t affect the original shared document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCloning}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClone} disabled={isCloning}>
              {isCloning ? 'Cloning...' : 'Clone'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
