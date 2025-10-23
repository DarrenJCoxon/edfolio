'use client';

import { useEffect, useState } from 'react';
import { FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SharedDocumentContextMenu } from './SharedDocumentContextMenu';
import { useFoliosStore } from '@/lib/stores/folios-store';

interface SharedPage {
  id: string;
  pageId: string;
  noteId: string;
  pageTitle: string;
  slug: string;
  folioId: string;
  folioName: string;
  sharerName: string;
  sharerEmail: string;
  permission: 'read' | 'edit';
  lastAccessedAt: Date;
  sharedAt: Date;
}

export function SharedPagesList() {
  const [sharedPages, setSharedPages] = useState<SharedPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Access store functions to open notes in editor
  const setActiveNote = useFoliosStore((state) => state.setActiveNote);
  const setActiveFolio = useFoliosStore((state) => state.setActiveFolio);
  const openTab = useFoliosStore((state) => state.openTab);

  useEffect(() => {
    fetchSharedPages();
  }, []);

  const fetchSharedPages = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/shares/my-shares');

      if (!response.ok) {
        throw new Error('Failed to fetch shared pages');
      }

      const { data } = await response.json();
      setSharedPages(data);
    } catch (err) {
      console.error('Error fetching shared pages:', err);
      setError('Failed to load shared pages');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageClick = (noteId: string, title: string, folioId: string) => {
    // Switch to the owner's folio so the note data is available
    setActiveFolio(folioId);
    // Open the shared note in the editor
    setActiveNote(noteId);
    openTab(noteId, title);
  };

  if (isLoading) {
    return (
      <div className="p-[var(--spacing-md)] text-sm text-muted-foreground">
        Loading shared pages...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-[var(--spacing-md)] text-sm text-destructive-foreground">
        {error}
      </div>
    );
  }

  if (sharedPages.length === 0) {
    return (
      <div className="p-[var(--spacing-md)] text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-center space-y-[var(--spacing-sm)] py-[var(--spacing-lg)]">
          <Users className="h-8 w-8 text-muted-foreground opacity-50" />
          <p className="text-center">No pages shared with you yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--spacing-xs)]">
      {sharedPages.map((page) => (
        <div
          key={page.id}
          className={cn(
            'flex items-start gap-[var(--spacing-sm)]',
            'rounded p-[var(--spacing-sm)]',
            'hover:bg-muted/50 transition-colors'
          )}
        >
          <button
            onClick={() => handlePageClick(page.noteId, page.pageTitle, page.folioId)}
            className="flex-1 flex items-start gap-[var(--spacing-sm)] text-left min-w-0"
          >
            <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground truncate">
                {page.pageTitle}
              </div>
              <div className="text-xs text-muted-foreground mt-[var(--spacing-xs)]">
                Shared by {page.sharerName}
              </div>
              <div className="flex items-center gap-[var(--spacing-sm)] mt-[var(--spacing-xs)]">
                <span
                  className={cn(
                    'text-xs px-[var(--spacing-xs)] py-0.5 rounded',
                    page.permission === 'edit'
                      ? 'bg-accent/10 text-accent'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {page.permission === 'edit' ? 'Can Edit' : 'Can View'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(page.lastAccessedAt)}
                </span>
              </div>
            </div>
          </button>
          <SharedDocumentContextMenu
            noteId={page.noteId}
            pageTitle={page.pageTitle}
            slug={page.slug}
            folioId={page.folioId}
            onRemove={() => fetchSharedPages()}
          />
        </div>
      ))}
    </div>
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
