'use client';

import { Editor } from '@tiptap/react';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';

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

    // Add styles for the table controls
    const styleId = 'table-controls-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Hide controls by default */
        .table-add-row-btn,
        .table-add-col-btn {
          display: none;
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          background: var(--accent);
          color: var(--accent-foreground);
          border: 1px solid var(--border);
          cursor: pointer;
          z-index: 10;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.15s ease;
        }

        .table-add-row-btn:hover,
        .table-add-col-btn:hover {
          background: var(--accent);
          transform: scale(1.1);
        }

        .table-add-row-btn svg,
        .table-add-col-btn svg {
          width: 14px;
          height: 14px;
        }

        /* Show row button when hovering over rows */
        tr:hover .table-add-row-btn {
          display: flex;
        }

        /* Show column button when hovering over header cells */
        th:hover .table-add-col-btn,
        td:hover .table-add-col-btn {
          display: flex;
        }

        /* Position row buttons */
        tr {
          position: relative;
        }

        .table-add-row-btn {
          right: -32px;
          top: 50%;
          transform: translateY(-50%);
        }

        .table-add-row-btn:hover {
          transform: translateY(-50%) scale(1.1);
        }

        /* Position column buttons */
        th, td {
          position: relative;
        }

        .table-add-col-btn {
          right: -12px;
          top: 50%;
          transform: translateY(-50%);
        }

        .table-add-col-btn:hover {
          transform: translateY(-50%) scale(1.1);
        }
      `;
      document.head.appendChild(style);
    }

    // Function to add controls to table
    const addControlsToTable = (table: HTMLTableElement) => {
      // Remove existing controls first
      table.querySelectorAll('.table-add-row-btn, .table-add-col-btn').forEach(btn => btn.remove());

      // Add row buttons
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, rowIndex) => {
        const existingBtn = row.querySelector('.table-add-row-btn');
        if (!existingBtn) {
          const btn = document.createElement('button');
          btn.className = 'table-add-row-btn';
          btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
          btn.title = 'Add row below';
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Find a cell in this row to set selection
            const cells = row.querySelectorAll('th, td');
            const lastCell = cells[cells.length - 1];

            if (lastCell) {
              const pos = editor.view.posAtDOM(lastCell, 0);
              editor.chain()
                .focus()
                .setTextSelection(pos)
                .addRowAfter()
                .run();
            }
          };
          row.appendChild(btn);
        }
      });

      // Add column buttons to first row cells
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        const cells = firstRow.querySelectorAll('th, td');
        cells.forEach((cell, colIndex) => {
          const existingBtn = cell.querySelector('.table-add-col-btn');
          if (!existingBtn) {
            const btn = document.createElement('button');
            btn.className = 'table-add-col-btn';
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
            btn.title = 'Add column to the right';
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();

              const pos = editor.view.posAtDOM(cell, 0);
              editor.chain()
                .focus()
                .setTextSelection(pos)
                .addColumnAfter()
                .run();
            };
            cell.appendChild(btn);
          }
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

    // Watch for table changes
    const observer = new MutationObserver(() => {
      updateAllTables();
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
