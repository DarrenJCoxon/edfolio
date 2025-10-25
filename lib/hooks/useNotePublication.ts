'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseNotePublicationOptions {
  activeNoteId: string | null;
}

export interface UseNotePublicationReturn {
  isPublished: boolean;
  publishedSlug: string | null;
  handlePublishSuccess: (slug: string) => void;
  handleUnpublishSuccess: () => void;
}

export function useNotePublication({
  activeNoteId,
}: UseNotePublicationOptions): UseNotePublicationReturn {
  const [isPublished, setIsPublished] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  // Fetch publication status when note changes
  useEffect(() => {
    if (!activeNoteId) {
      setIsPublished(false);
      setPublishedSlug(null);
      return;
    }

    const fetchPublicationStatus = async () => {
      try {
        const response = await fetch(`/api/notes/${activeNoteId}/publish/status`);

        if (!response.ok) {
          // If error fetching status, assume not published
          setIsPublished(false);
          setPublishedSlug(null);
          return;
        }

        const data = await response.json();
        setIsPublished(data.isPublished);
        setPublishedSlug(data.slug);
      } catch (error) {
        setIsPublished(false);
        setPublishedSlug(null);
      }
    };

    fetchPublicationStatus();
  }, [activeNoteId]);

  // Handle successful publish
  const handlePublishSuccess = useCallback((slug: string) => {
    setIsPublished(true);
    setPublishedSlug(slug);
  }, []);

  // Handle successful unpublish
  const handleUnpublishSuccess = useCallback(() => {
    setIsPublished(false);
    setPublishedSlug(null);
  }, []);

  return {
    isPublished,
    publishedSlug,
    handlePublishSuccess,
    handleUnpublishSuccess,
  };
}
