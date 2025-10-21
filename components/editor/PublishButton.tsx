'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UnpublishConfirmDialog } from './UnpublishConfirmDialog';
import type { PublishButtonProps } from '@/types';

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

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notes/${noteId}/publish`, {
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
      const response = await fetch(`/api/notes/${noteId}/publish`, {
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

  const handleClick = () => {
    if (isPublished) {
      setShowUnpublishDialog(true);
    } else {
      handlePublish();
    }
  };

  const publicUrl = publishedSlug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/public/${publishedSlug}`
    : '';

  return (
    <>
      <Button
        variant={isPublished ? 'outline' : 'default'}
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
        aria-label={
          isPublished ? 'Unpublish page' : 'Publish page'
        }
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Globe className="h-4 w-4 mr-2" />
        )}
        {isPublished ? 'Unpublish' : 'Publish'}
      </Button>

      <UnpublishConfirmDialog
        isOpen={showUnpublishDialog}
        onConfirm={handleUnpublish}
        onCancel={() => setShowUnpublishDialog(false)}
        publicUrl={publicUrl}
      />
    </>
  );
}
