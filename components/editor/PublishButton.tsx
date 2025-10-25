'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { UnpublishConfirmDialog } from './UnpublishConfirmDialog';
import { ShareManagementModal } from '@/components/publish/ShareManagementModal';
import type { PublishButtonProps } from '@/types';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';

/**
 * PublishButton Component
 *
 * Provides a toggle button for publishing and unpublishing pages.
 * Shows loading state during API calls and displays success/error toasts.
 */
export function PublishButton({
  noteId,
  isPublished,
  publishedSlug,
  onPublishSuccess,
  onUnpublishSuccess,
}: PublishButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      const response = await fetchWithCsrf(`/api/notes/${noteId}/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish');
      }

      const data = await response.json();
      const publicUrl = `${window.location.origin}${data.data.publicUrl}`;

      onPublishSuccess(data.data.slug);

      // Show success toast with copy link action
      toast.success('Page published!', {
        description: 'Your page is now publicly accessible.',
        action: {
          label: 'Copy Link',
          onClick: () => {
            navigator.clipboard.writeText(publicUrl);
            toast.success('Link copied to clipboard');
          },
        },
      });
    } catch (error) {
      console.error('Publish error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to publish page';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async () => {
    setIsLoading(true);
    setShowUnpublishDialog(false);

    try {
      const response = await fetchWithCsrf(`/api/notes/${noteId}/publish`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unpublish');
      }

      onUnpublishSuccess();
      toast.success('Page unpublished', {
        description: 'Your page is no longer publicly accessible.',
      });
    } catch (error) {
      console.error('Unpublish error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to unpublish page';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch note title when modal opens
  const handleShareClick = async () => {
    try {
      const response = await fetch(`/api/notes/${noteId}`);
      if (response.ok) {
        const data = await response.json();
        setNoteTitle(data.data.title || 'Untitled');
      }
    } catch (error) {
      console.error('Failed to fetch note title:', error);
      setNoteTitle('Untitled');
    }
    setShowShareModal(true);
  };

  const handleClick = () => {
    if (!isPublished) {
      handlePublish();
    }
  };

  const publicUrl = publishedSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/public/${publishedSlug}`
    : '';

  return (
    <>
      {isPublished ? (
        <Button
          variant="default"
          size="sm"
          onClick={handleShareClick}
          disabled={isLoading}
          aria-label="Share page"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={handleClick}
          disabled={isLoading}
          aria-label="Publish page"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Globe className="h-4 w-4 mr-2" />
          )}
          Publish
        </Button>
      )}

      <UnpublishConfirmDialog
        isOpen={showUnpublishDialog}
        onConfirm={handleUnpublish}
        onCancel={() => setShowUnpublishDialog(false)}
        publicUrl={publicUrl}
      />

      <ShareManagementModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        noteId={noteId}
        noteTitle={noteTitle}
        publicSlug={publishedSlug || ''}
      />
    </>
  );
}
