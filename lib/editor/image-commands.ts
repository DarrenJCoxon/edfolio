/**
 * Image Command Definitions for TipTap
 * Provides image insertion command
 */

import { ImageIcon } from 'lucide-react';
import {
  CommandCategory,
  CommandContext,
  type SlashCommandItem,
  type CommandActionParams,
} from './slash-commands/types';

export const imageCommands: SlashCommandItem[] = [
  {
    id: 'image',
    title: 'Image',
    description: 'Upload and insert an image',
    icon: ImageIcon,
    category: CommandCategory.FORMAT,
    contexts: [CommandContext.DOCUMENT],
    keywords: ['image', 'picture', 'photo', 'upload', 'img'],
    action: (params: CommandActionParams) => {
      const { editor, range } = params;
      if (range) {
        // Delete the slash command text
        editor.chain().focus().deleteRange(range).run();

        // Trigger file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (!file) return;

          try {
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            // Note: noteId should be passed from editor context if available
            formData.append('noteId', 'temp');

            // Upload image
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Upload failed');
            }

            const data = await response.json();

            // Insert image at current position
            editor.chain().focus().setImage({ src: data.url }).run();
          } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please try again.');
          }
        };
        input.click();
      }
    },
  },
];
