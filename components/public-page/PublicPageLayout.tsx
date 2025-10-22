'use client';

import Link from 'next/link';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Eye, Edit3 } from 'lucide-react';
import { Callout } from '@/lib/editor/callout';
import { lowlight } from '@/lib/editor/code-block-config';
import { CloneButton } from '@/components/publish/CloneButton';
import type { PublicPageLayoutProps } from '@/types';

interface ExtendedPublicPageLayoutProps extends PublicPageLayoutProps {
  noteId: string;
  sharePermission: 'read' | 'edit' | null;
  shareToken?: string;
  isOwner: boolean;
  isAuthenticated: boolean;
}

/**
 * PublicPageLayout Component
 *
 * Renders a published page in a clean, distraction-free layout
 * for anonymous visitors. Uses the same TipTap extensions as the
 * editor to ensure content renders identically.
 *
 * Story 3.2: Now supports shared access with permission badges and clone button
 */
export function PublicPageLayout({
  title,
  content,
  publishedAt,
  noteId,
  sharePermission,
  shareToken,
  isOwner,
  isAuthenticated,
}: ExtendedPublicPageLayoutProps) {
  // Convert TipTap JSON to HTML using same extensions as editor
  const html = generateHTML(content as Parameters<typeof generateHTML>[0], [
    StarterKit.configure({
      codeBlock: false, // Use CodeBlockLowlight instead
    }),
    Typography,
    Callout,
    Table.configure({
      resizable: true,
      cellMinWidth: 50,
      handleWidth: 5,
      lastColumnResizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    Image.configure({
      inline: true,
      allowBase64: false,
      HTMLAttributes: {
        class: 'editor-image',
      },
    }),
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'plaintext',
      languageClassPrefix: 'language-',
    }),
  ]);

  // Format publication date
  const formattedDate = new Date(publishedAt).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[var(--public-background)]">
      {/* Header */}
      <header className="h-[var(--public-header-height)] border-b border-[var(--public-border)] bg-[var(--public-background)] fixed top-0 left-0 right-0 z-50">
        <div className="max-w-[var(--public-max-width)] mx-auto h-full px-[var(--spacing-md)] flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold text-[var(--public-foreground)] hover:text-[var(--public-accent)] transition-colors"
            aria-label="Go to Edfolio homepage"
          >
            Edfolio
          </Link>

          {/* Clone Button - Show for authenticated users with edit permission */}
          {!isOwner &&
            isAuthenticated &&
            sharePermission === 'edit' &&
            shareToken && (
              <CloneButton
                noteId={noteId}
                noteTitle={title}
                accessToken={shareToken}
              />
            )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[var(--public-max-width)] mx-auto px-[var(--spacing-md)] pt-[calc(var(--public-header-height)+var(--spacing-xl))] pb-[var(--spacing-xl)]">
        {/* Permission Banner - Show for shared access */}
        {sharePermission && !isOwner && (
          <div
            className={`mb-[var(--spacing-md)] p-[var(--spacing-sm)] rounded-lg border flex items-center gap-2 ${
              sharePermission === 'edit'
                ? 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100'
                : 'bg-muted/30 border-border text-foreground'
            }`}
          >
            {sharePermission === 'edit' ? (
              <>
                <Edit3 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  You have edit access to this page
                </span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">
                  You have view-only access to this page
                </span>
              </>
            )}
          </div>
        )}

        {/* Page Title */}
        <h1 className="text-4xl font-bold mb-[var(--spacing-sm)] text-[var(--public-foreground)]">
          {title}
        </h1>

        {/* Publication Date */}
        <p className="text-sm text-[var(--public-muted)] mb-[var(--spacing-xl)]">
          Published on {formattedDate}
        </p>

        {/* Rendered Content */}
        <div
          className="public-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>

      {/* Footer */}
      <footer className="mt-[var(--spacing-xl)] py-[var(--spacing-lg)] border-t border-[var(--public-border)]">
        <div className="max-w-[var(--public-max-width)] mx-auto px-[var(--spacing-md)] text-center">
          <p className="text-sm text-[var(--public-muted)]">
            Powered by{' '}
            <Link
              href="/"
              className="text-[var(--public-accent)] hover:underline transition-colors"
            >
              Edfolio
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
