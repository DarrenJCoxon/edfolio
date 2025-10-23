'use client';

import { Editor } from '@tiptap/react';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';

interface TableControlsProps {
  editor: Editor;
}

/**
 * TableControls - Notion-style table row/column insertion
 * Uses pure CSS for hover states to avoid React rendering issues
 * Buttons are injected once into table structure and styled via CSS
 */
export function TableControls({ editor }: TableControlsProps) {
  useEffect(() => {
    if (!editor || !editor.isEditable) return;

    const editorElement = editor.view.dom;

    // Add control buttons to all tables (runs once on mount and when content changes significantly)
    const addControlsToTables = () => {
      const tables = editorElement.querySelectorAll('table');

      tables.forEach((table) => {
        // Skip if already has controls
        if (table.querySelector('.table-controls-wrapper')) return;

        // Wrap table for positioning context
        if (!table.parentElement?.classList.contains('table-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.className = 'table-wrapper';
          table.parentNode?.insertBefore(wrapper, table);
          wrapper.appendChild(table);
        }

        // Add row add buttons
        const rows = table.querySelectorAll('tr');
        rows.forEach((row, index) => {
          if (!row.querySelector('.table-row-add')) {
            const btn = document.createElement('button');
            btn.className = 'table-row-add';
            btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
            btn.title = 'Add row below';
            btn.contentEditable = 'false';

            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();

              // Find a cell in this row to position cursor
              const cell = row.querySelector('td, th');
              if (cell) {
                const pos = editor.view.posAtDOM(cell, 0);
                editor.chain().focus().setTextSelection(pos).addRowAfter().run();
              }
            };

            row.appendChild(btn);
          }
        });

        // Add column add buttons to header row
        const headerRow = table.querySelector('tr');
        if (headerRow) {
          const cells = headerRow.querySelectorAll('th, td');
          cells.forEach((cell) => {
            if (!cell.querySelector('.table-col-add')) {
              const btn = document.createElement('button');
              btn.className = 'table-col-add';
              btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
              btn.title = 'Add column to the right';
              btn.contentEditable = 'false';

              btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const pos = editor.view.posAtDOM(cell, 0);
                editor.chain().focus().setTextSelection(pos).addColumnAfter().run();
              };

              cell.appendChild(btn);
            }
          });
        }
      });
    };

    // Initial setup
    addControlsToTables();

    // Re-add controls when editor content updates (new table added, etc.)
    const handleUpdate = () => {
      // Use setTimeout to batch updates and avoid running too frequently
      setTimeout(() => addControlsToTables(), 100);
    };

    editor.on('update', handleUpdate);

    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  // This component renders nothing - controls are added directly to tables
  return null;
}
