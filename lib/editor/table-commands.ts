/**
 * Table Command Definitions for TipTap
 * Provides table insertion and manipulation commands
 */

import { Table2 } from 'lucide-react';
import {
  CommandCategory,
  CommandContext,
  type SlashCommandItem,
  type CommandActionParams,
} from './slash-commands/types';

export const tableCommands: SlashCommandItem[] = [
  {
    id: 'table',
    title: 'Table',
    description: 'Insert a 3x3 table',
    icon: Table2,
    category: CommandCategory.FORMAT,
    contexts: [CommandContext.DOCUMENT],
    keywords: ['table', 'grid', 'spreadsheet', 'data'],
    action: (params: CommandActionParams) => {
      const { editor, range } = params;
      if (range) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run();
      }
    },
  },
];
