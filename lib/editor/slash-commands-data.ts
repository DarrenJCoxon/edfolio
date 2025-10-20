import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Info,
  Minus,
} from 'lucide-react';
import type { CommandItem } from '@/types';

/**
 * Slash command definitions for the editor.
 * Each command includes a title, icon, keywords for filtering, and a TipTap chain command.
 */
export const SLASH_COMMANDS: CommandItem[] = [
  {
    title: 'Heading 1',
    icon: Heading1,
    keywords: ['h1', 'heading', 'title', 'large'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 1 })
        .run();
    },
  },
  {
    title: 'Heading 2',
    icon: Heading2,
    keywords: ['h2', 'heading', 'subtitle'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 2 })
        .run();
    },
  },
  {
    title: 'Heading 3',
    icon: Heading3,
    keywords: ['h3', 'heading', 'subheading'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setNode('heading', { level: 3 })
        .run();
    },
  },
  {
    title: 'Bulleted List',
    icon: List,
    keywords: ['ul', 'list', 'bullet', 'unordered'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBulletList()
        .run();
    },
  },
  {
    title: 'Numbered List',
    icon: ListOrdered,
    keywords: ['ol', 'list', 'numbered', 'ordered'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleOrderedList()
        .run();
    },
  },
  {
    title: 'Quote',
    icon: Quote,
    keywords: ['quote', 'blockquote', 'citation'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleBlockquote()
        .run();
    },
  },
  {
    title: 'Code Block',
    icon: Code,
    keywords: ['code', 'codeblock', 'pre', 'monospace'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleCodeBlock()
        .run();
    },
  },
  {
    title: 'Callout',
    icon: Info,
    keywords: ['callout', 'info', 'note', 'box', 'highlight'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setCallout()
        .run();
    },
  },
  {
    title: 'Horizontal Rule',
    icon: Minus,
    keywords: ['hr', 'divider', 'line', 'separator'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setHorizontalRule()
        .run();
    },
  },
];
