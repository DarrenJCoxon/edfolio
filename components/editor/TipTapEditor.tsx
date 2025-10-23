'use client';

import { useEditor, EditorContent, type Content } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Callout } from '@/lib/editor/callout';
import { SlashCommands } from '@/lib/editor/slash-commands/extension';
import { lowlight } from '@/lib/editor/code-block-config';
import { InlineTitleField } from './InlineTitleField';
import { TableControls } from './TableControls';

import type { Editor as TipTapEditorType } from '@tiptap/react';

export interface TipTapEditorProps {
  content: unknown;
  onChange: (content: unknown) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  isNewNote?: boolean;
  onSelectionChange?: (text: string, hasSelection: boolean) => void;
  onEditorReady?: (editor: TipTapEditorType) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
}

export function TipTapEditor({
  content,
  onChange,
  title,
  onTitleChange,
  isNewNote = false,
  onSelectionChange,
  onEditorReady,
  editable = true,
  placeholder = 'Start typing...',
  className,
}: TipTapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // Required for Next.js 15 compatibility
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block to use CodeBlockLowlight
      }),
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      Callout,
      SlashCommands,
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
    ],
    content: content as Content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to);
      onSelectionChange?.(text, from !== to);
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

  // Notify parent component when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('tiptap-editor group/editor relative', className)}>
      {title !== undefined && onTitleChange && (
        <InlineTitleField
          title={title}
          onTitleChange={onTitleChange}
          isNewNote={isNewNote}
        />
      )}
      <EditorContent editor={editor} />
      <TableControls editor={editor} />
    </div>
  );
}
