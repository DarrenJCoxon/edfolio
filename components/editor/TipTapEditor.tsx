'use client';

import { useEditor, EditorContent, Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Callout } from '@/lib/editor/callout';
import { SlashCommand } from '@/lib/editor/slash-command';

export interface TipTapEditorProps {
  content: unknown;
  onChange: (content: unknown) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

export function TipTapEditor({
  content,
  onChange,
  onFocus,
  onBlur,
  placeholder = 'Start writing...',
  editable = true,
  className,
}: TipTapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatch in Next.js
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      Bold,
      Italic,
      Callout,
      SlashCommand,
    ],
    content: content as Content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    onFocus,
    onBlur,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-neutral dark:prose-invert max-w-none',
          'focus:outline-none',
          'min-h-[calc(100vh-8rem)]',
          'text-[var(--foreground)]'
        ),
      },
    },
  });

  // Update editor content when prop changes (e.g., switching notes)
  useEffect(() => {
    if (editor && content !== editor.getJSON()) {
      editor.commands.setContent(content as Content);
    }
  }, [editor, content]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) {
    return null;
  }

  return (
    <EditorContent
      editor={editor}
      className={cn(
        'w-full h-full',
        'tiptap-editor',
        className
      )}
    />
  );
}
