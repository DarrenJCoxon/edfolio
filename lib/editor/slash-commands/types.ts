/**
 * Slash Command Types
 * Type definitions for the slash command system
 */

import type { Editor } from '@tiptap/core';
import type { LucideIcon } from 'lucide-react';

export enum CommandCategory {
  FORMAT = 'Text Formatting',
}

export enum CommandContext {
  DOCUMENT = 'document',
}

export interface SlashCommandItem {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: CommandCategory;
  contexts: CommandContext[];
  keywords?: string[];
  shortcut?: string;
  action: (params: CommandActionParams) => void | Promise<void>;
}

export interface CommandActionParams {
  editor: Editor;
  range?: { from: number; to: number };
  query?: string;
}

export interface SlashMenuProps {
  editor: Editor | null;
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  decorationNode?: Element | null;
}
