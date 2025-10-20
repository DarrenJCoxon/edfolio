'use client';

import { useEditor, EditorContent, type Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Callout } from '@/lib/editor/callout';
import { SlashCommands } from '@/lib/editor/slash-commands/extension';

export interface TipTapEditorProps {
  content: unknown;
  onChange: (content: unknown) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
}

export function TipTapEditor({
  content,
  onChange,
  editable = true,
  placeholder = 'Start typing...',
  className,
}: TipTapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // Required for Next.js 15 compatibility
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      Callout,
      SlashCommands,
    ],
    content: content as Content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
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

  // Update editor content when prop changes (for note switching)
  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getJSON();
      const newContent = content as Content;

      // Only update if content actually changed to prevent unnecessary re-renders
      if (JSON.stringify(currentContent) !== JSON.stringify(newContent)) {
        editor.commands.setContent(newContent);
      }
    }
  }, [content, editor]);

  // Update editable state when prop changes
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('tiptap-editor', className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
