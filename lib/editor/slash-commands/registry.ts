/**
 * Slash Command Registry
 * Central registry of all slash commands for edfolio
 */

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

import {
  CommandCategory,
  CommandContext,
  type SlashCommandItem,
  type CommandActionParams,
} from './types';

// Document formatting commands
const formatCommands: SlashCommandItem[] = [
  {
    id: 'heading1',
    title: 'Heading 1',
    description: 'Large section heading',
    icon: Heading1,
    category: CommandCategory.FORMAT,
    contexts: [CommandContext.DOCUMENT],
    keywords: ['h1', 'heading', 'title'],
    action: (params: CommandActionParams) => {
      const { editor, range } = params;
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 1 })
          .run();
      }
    },
  },
  {
    id: 'heading2',
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: Heading2,
    category: CommandCategory.FORMAT,
    contexts: [CommandContext.DOCUMENT],
    keywords: ['h2', 'heading', 'subtitle'],
    action: (params: CommandActionParams) => {
      const { editor, range } = params;
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 2 })
          .run();
      }
    },
  },
  {
    id: 'heading3',
    title: 'Heading 3',
    description: 'Small section heading',
    icon: Heading3,
    category: CommandCategory.FORMAT,
    contexts: [CommandContext.DOCUMENT],
    keywords: ['h3', 'heading', 'subheading'],
    action: (params: CommandActionParams) => {
      const { editor, range } = params;
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleHeading({ level: 3 })
          .run();
      }
    },
  },
  {
    id: 'bullet-list',
    title: 'Bulleted List',
    description: 'Create a simple list',
    icon: List,
    category: CommandCategory.FORMAT,
    contexts: [CommandContext.DOCUMENT],
    keywords: ['bullet', 'list', 'unordered', 'ul'],
    action: (params: CommandActionParams) => {
      const { editor, range } = params;
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleBulletList()
          .run();
      }
    },
  },
  {
    id: 'numbered-list',
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: ListOrdered,
    category: CommandCategory.FORMAT,
    contexts: [CommandContext.DOCUMENT],
    keywords: ['numbered', 'ordered', 'list', 'ol'],
    action: (params: CommandActionParams) => {
      const { editor, range } = params;
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleOrderedList()
          .run();
      }
    },
  },
  {
    id: 'quote',
    title: 'Quote',
    description: 'Add a blockquote',
    icon: Quote,
    category: CommandCategory.FORMAT,
    contexts: [CommandContext.DOCUMENT],
    keywords: ['quote', 'blockquote', 'citation'],
    action: (params: CommandActionParams) => {
      const { editor, range } = params;
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleBlockquote()
          .run();
      }
    },
  },
  {
    id: 'code-block',
    title: 'Code Block',
    description: 'Display code with syntax highlighting',
    icon: Code,
    category: CommandCategory.FORMAT,
    contexts: [CommandContext.DOCUMENT],
    keywords: ['code', 'snippet', 'programming'],
    action: (params: CommandActionParams) => {
      const { editor, range } = params;
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .toggleCodeBlock()
          .run();
      }
    },
  },
  {
    id: 'callout',
    title: 'Callout',
    description: 'Add a highlighted callout box',
    icon: Info,
    category: CommandCategory.FORMAT,
    contexts: [CommandContext.DOCUMENT],
    keywords: ['callout', 'info', 'note', 'box', 'highlight'],
    action: (params: CommandActionParams) => {
      const { editor, range } = params;
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setCallout()
          .run();
      }
    },
  },
  {
    id: 'divider',
    title: 'Horizontal Rule',
    description: 'Add a horizontal line',
    icon: Minus,
    category: CommandCategory.FORMAT,
    contexts: [CommandContext.DOCUMENT],
    keywords: ['hr', 'divider', 'separator', 'line'],
    action: (params: CommandActionParams) => {
      const { editor, range } = params;
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setHorizontalRule()
          .run();
      }
    },
  },
];

// Export all commands
export const allCommands: SlashCommandItem[] = [...formatCommands];

// Get commands for a specific context
export function getCommandsForContext(context: CommandContext): SlashCommandItem[] {
  return allCommands.filter((cmd) => cmd.contexts.includes(context));
}

// Filter commands based on search query
export function filterCommands(
  commands: SlashCommandItem[],
  query: string
): SlashCommandItem[] {
  if (!query) return commands;

  const searchTerm = query.toLowerCase();

  return commands
    .filter((cmd) => {
      // Check title
      if (cmd.title.toLowerCase().includes(searchTerm)) return true;

      // Check description
      if (cmd.description.toLowerCase().includes(searchTerm)) return true;

      // Check keywords
      if (cmd.keywords?.some((keyword) => keyword.toLowerCase().includes(searchTerm)))
        return true;

      return false;
    })
    .sort((a, b) => {
      // Prioritize exact title matches
      const aExact = a.title.toLowerCase() === searchTerm;
      const bExact = b.title.toLowerCase() === searchTerm;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Then prioritize title starts with
      const aStarts = a.title.toLowerCase().startsWith(searchTerm);
      const bStarts = b.title.toLowerCase().startsWith(searchTerm);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return 0;
    });
}
