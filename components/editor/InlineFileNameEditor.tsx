'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InlineFileNameEditorProps {
  fileName: string;
  isEditing: boolean;
  onSave: (newName: string) => Promise<void>;
  onCancel: () => void;
  onEditStart: () => void;
  className?: string;
}

/**
 * InlineFileNameEditor Component
 * Allows inline editing of file/folder names with validation
 */
export function InlineFileNameEditor({
  fileName,
  isEditing,
  onSave,
  onCancel,
  onEditStart,
  className,
}: InlineFileNameEditorProps) {
  const [inputValue, setInputValue] = useState(fileName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when fileName prop changes
  useEffect(() => {
    setInputValue(fileName);
  }, [fileName]);

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedValue = inputValue.trim();

    // Validate input
    if (trimmedValue.length === 0) {
      setError('Name cannot be empty');
      return;
    }

    // If name hasn't changed, just cancel
    if (trimmedValue === fileName) {
      onCancel();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(trimmedValue);
      // onSave should handle updating the parent state
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setError(null);
      setInputValue(fileName);
      onCancel();
    }
  };

  const handleBlur = () => {
    // Don't save on blur if there's an error - let user fix it
    if (!error && !isLoading) {
      handleSave();
    }
  };

  if (isEditing) {
    return (
      <div className={cn('inline-editor-container', className)}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isLoading}
          className={cn(
            'inline-editor-input',
            error && 'error',
            'text-[var(--foreground)]',
            'bg-[var(--background)]',
            'border-[var(--border)]',
            'focus:border-[var(--input-focus-ring)]'
          )}
          aria-label="Edit name"
        />
        {isLoading && (
          <Loader2
            className="animate-spin ml-[var(--spacing-xs)]"
            size={16}
            style={{ color: 'var(--muted)' }}
          />
        )}
        {error && (
          <span
            className="text-xs mt-[var(--spacing-xs)] block"
            style={{ color: 'var(--destructive)' }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <span
      onClick={onEditStart}
      className={cn(
        'cursor-pointer hover:opacity-70 transition-opacity',
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEditStart();
        }
      }}
    >
      {fileName}
    </span>
  );
}
