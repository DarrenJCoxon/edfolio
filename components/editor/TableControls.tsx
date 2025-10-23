'use client';

import { Editor } from '@tiptap/react';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TableControlsProps {
  editor: Editor;
}

/**
 * TableControls component adds Notion-style hover controls for inserting rows and columns
 * Shows small + buttons when hovering near the edges of table cells
 */
export function TableControls({ editor }: TableControlsProps) {
  useEffect(() => {
    if (!editor || !editor.isEditable) return;

    const editorElement = editor.view.dom;

    // Function to add controls to table
    const addControlsToTable = (table: HTMLTableElement) => {
      // Remove existing controls first
      table.querySelectorAll('.table-add-row-btn, .table-add-col-btn').forEach(btn => btn.remove());

      // Add row buttons
      const rows = table.querySelectorAll('tr');
      rows.forEach((row) => {
        const btn = document.createElement('button');
        btn.className = cn(
          'table-add-row-btn',
          'hidden group-hover/row:flex',
          'absolute right-[calc(-1*var(--spacing-lg))]',
          'top-1/2 -translate-y-1/2',
          'w-6 h-6',
          'items-center justify-center',
          'rounded',
          'bg-accent text-accent-foreground',
          'hover:scale-110',
          'transition-transform duration-150',
          'border border-border',
          'shadow-md',
          'z-10',
          'cursor-pointer'
        );
        btn.setAttribute('aria-label', 'Add row below');
        btn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        `;
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();

          const cells = row.querySelectorAll('th, td');
          const lastCell = cells[cells.length - 1];

          if (lastCell) {
            const pos = editor.view.posAtDOM(lastCell, 0);
            editor.chain().focus().setTextSelection(pos).addRowAfter().run();
          }
        };

        // Add group class to row for hover detection
        row.classList.add('group/row', 'relative');
        row.appendChild(btn);
      });

      // Add column buttons to first row cells
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const cells = firstRow.querySelectorAll('th, td');
        cells.forEach((cell) => {
          const btn = document.createElement('button');
          btn.className = cn(
            'table-add-col-btn',
            'hidden group-hover/cell:flex',
            'absolute right-[calc(-1*var(--spacing-sm))]',
            'top-1/2 -translate-y-1/2',
            'w-6 h-6',
            'items-center justify-center',
            'rounded',
            'bg-accent text-accent-foreground',
            'hover:scale-110',
            'transition-transform duration-150',
            'border border-border',
            'shadow-md',
            'z-10',
            'cursor-pointer'
          );
          btn.setAttribute('aria-label', 'Add column to the right');
          btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          `;
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const pos = editor.view.posAtDOM(cell, 0);
            editor.chain().focus().setTextSelection(pos).addColumnAfter().run();
          };

          // Add group class to cell for hover detection
          (cell as HTMLElement).classList.add('group/cell', 'relative');
          cell.appendChild(btn);
        });
      }
    };

    // Function to update all tables
    const updateAllTables = () => {
      const tables = editorElement.querySelectorAll('table');
      tables.forEach((table) => {
        addControlsToTable(table as HTMLTableElement);
      });
    };

    // Initial update
    updateAllTables();

    // Watch for table changes - but ignore mutations to our own button elements
    const observer = new MutationObserver((mutations) => {
      // Only update if mutations include actual table structure changes, not our button additions
      const hasRelevantChange = mutations.some((mutation) => {
        // Ignore mutations to our control buttons
        if (
          mutation.target instanceof Element &&
          (mutation.target.classList.contains('table-add-row-btn') ||
            mutation.target.classList.contains('table-add-col-btn'))
        ) {
          return false;
        }
        // Ignore additions/removals of our control buttons
        const isOurButton = (node: Node) =>
          node instanceof Element &&
          (node.classList.contains('table-add-row-btn') ||
            node.classList.contains('table-add-col-btn'));

        if (Array.from(mutation.addedNodes).some(isOurButton)) return false;
        if (Array.from(mutation.removedNodes).some(isOurButton)) return false;

        return true;
      });

      if (hasRelevantChange) {
        updateAllTables();
      }
    });

    observer.observe(editorElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      // Clean up controls
      editorElement.querySelectorAll('.table-add-row-btn, .table-add-col-btn').forEach(btn => btn.remove());
    };
  }, [editor]);

  return null; // This component doesn't render anything itself
}
