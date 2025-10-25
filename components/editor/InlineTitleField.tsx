'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export interface InlineTitleFieldProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  isNewNote?: boolean;
  className?: string;
}

/**
 * InlineTitleField Component
 * Displays a dedicated title field at the top of the editor (Notion/Obsidian style)
 * - Auto-focuses on new note creation
 * - Auto-generates "Untitled - [timestamp]" if left empty
 * - Uses h1 styling from globals.css
 */
export function InlineTitleField({
  title,
  onTitleChange,
  isNewNote = false,
  className,
}: InlineTitleFieldProps) {
  const [localTitle, setLocalTitle] = useState(title);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Update local title when prop changes (e.g., switching notes)
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  // Auto-focus on new note creation
  useEffect(() => {
    if (isNewNote && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isNewNote]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [localTitle]);

  /**
   * Generate timestamp in format: "Untitled - Mon DD, YYYY"
   * Example: "Untitled - Jan 23, 2025"
   */
  const generateUntitledTimestamp = (): string => {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = now.getDate();
    const year = now.getFullYear();
    return `Untitled - ${month} ${day}, ${year}`;
  };

  const handleBlur = () => {
    const trimmedTitle = localTitle.trim();

    // If empty, generate timestamp
    if (trimmedTitle.length === 0) {
      const timestampTitle = generateUntitledTimestamp();
      setLocalTitle(timestampTitle);
      onTitleChange(timestampTitle);
    } else {
      // Save the title if it changed
      if (trimmedTitle !== title) {
        onTitleChange(trimmedTitle);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur(); // Trigger blur to save
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocalTitle(title); // Revert to original
      inputRef.current?.blur();
    }
    // Tab key naturally moves to next focusable element (editor content)
  };

  return (
    <div className={cn('inline-title-field-container', className)}>
      <textarea
        ref={inputRef}
        value={localTitle}
        onChange={(e) => setLocalTitle(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Untitled"
        rows={1}
        className={cn(
          // Typography matching h1 from globals.css (line 331-338)
          'text-[2.25rem]',
          'font-bold',
          'leading-[2.75rem]',
          'text-[var(--foreground)]',
          'placeholder:text-[var(--title-placeholder-color)]',
          // Layout
          'w-full',
          'mt-[var(--title-margin-top)]',
          'mb-[var(--title-margin-bottom)]',
          // Remove default textarea styles
          'border-none',
          'outline-none',
          'bg-transparent',
          'p-0',
          'resize-none',
          'overflow-hidden',
          // Wrapping
          'whitespace-pre-wrap',
          'break-words',
          // Interaction
          'focus:outline-none',
          'focus:ring-0',
          'transition-colors'
        )}
        aria-label="Note title"
      />
    </div>
  );
}
