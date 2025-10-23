'use client';

import { Editor } from '@tiptap/react';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TableControlsProps {
  editor: Editor;
}

interface ButtonPosition {
  top: number;
  left: number;
}

/**
 * TableControls component adds hover UI for inserting rows and columns
 * Shows plus icons at the end of rows and bottom of columns when hovering over tables
 */
export function TableControls({ editor }: TableControlsProps) {
  const [hoveredTable, setHoveredTable] = useState<HTMLElement | null>(null);
  const [rowButtons, setRowButtons] = useState<ButtonPosition[]>([]);
  const [colButtons, setColButtons] = useState<ButtonPosition[]>([]);
  const [tableRect, setTableRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const editorElement = editor.view.dom;
    let rafId: number | null = null;

    const updateButtonPositions = (table: HTMLElement) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      const rect = table.getBoundingClientRect();
      const editorRect = editorElement.getBoundingClientRect();

      setTableRect(rect);

      // Calculate row button positions (right side of table)
      const rowPositions = rows.map(row => {
        const rowRect = row.getBoundingClientRect();
        return {
          top: rowRect.top - editorRect.top + rowRect.height / 2,
          left: rect.right - editorRect.left + 8,
        };
      });
      setRowButtons(rowPositions);

      // Calculate column button positions (bottom of table)
      if (rows.length > 0) {
        const firstRow = rows[0];
        const cells = Array.from(firstRow.querySelectorAll('th, td'));
        const colPositions = cells.map(cell => {
          const cellRect = cell.getBoundingClientRect();
          return {
            top: rect.bottom - editorRect.top + 8,
            left: cellRect.left - editorRect.left + cellRect.width / 2,
          };
        });
        setColButtons(colPositions);
      }
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const table = target.closest('table');

      if (table && editor.isEditable && table !== hoveredTable) {
        setHoveredTable(table);

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
          updateButtonPositions(table);
        });
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if we're leaving the table entirely
      if (!target.closest('table')) {
        setHoveredTable(null);
        setRowButtons([]);
        setColButtons([]);
        setTableRect(null);
      }
    };

    editorElement.addEventListener('mouseover', handleMouseOver, true);
    editorElement.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      editorElement.removeEventListener('mouseover', handleMouseOver, true);
      editorElement.removeEventListener('mouseleave', handleMouseLeave, true);

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [editor, hoveredTable]);

  const addRowAfter = (rowIndex: number) => {
    if (!hoveredTable) return;

    const rows = hoveredTable.querySelectorAll('tr');
    const targetRow = rows[rowIndex];
    if (!targetRow) return;

    const cells = targetRow.querySelectorAll('th, td');
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

  const addColumnAfter = (colIndex: number) => {
    if (!hoveredTable) return;

    const firstRow = hoveredTable.querySelector('tr');
    if (!firstRow) return;

    const cells = firstRow.querySelectorAll('th, td');
    const targetCell = cells[colIndex];

    if (targetCell) {
      const pos = editor.view.posAtDOM(targetCell, 0);
      editor.chain()
        .focus()
        .setTextSelection(pos)
        .addColumnAfter()
        .run();
    }
  };

  if (!hoveredTable || !tableRect) return null;

  return (
    <div className="table-controls pointer-events-none">
      {/* Row add buttons - right side of table */}
      {rowButtons.map((button, index) => (
        <button
          key={`row-${index}`}
          className={cn(
            'absolute z-50 flex items-center justify-center pointer-events-auto',
            'w-6 h-6 rounded-full',
            'bg-accent text-accent-foreground',
            'hover:bg-accent/90 hover:scale-110',
            'transition-all duration-150',
            'shadow-md border border-border',
            'cursor-pointer'
          )}
          style={{
            top: `${button.top}px`,
            left: `${button.left}px`,
            transform: 'translateY(-50%)',
          }}
          onClick={() => addRowAfter(index)}
          onMouseDown={(e) => e.preventDefault()}
          title="Add row below"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      ))}

      {/* Column add buttons - bottom of table */}
      {colButtons.map((button, index) => (
        <button
          key={`col-${index}`}
          className={cn(
            'absolute z-50 flex items-center justify-center pointer-events-auto',
            'w-6 h-6 rounded-full',
            'bg-accent text-accent-foreground',
            'hover:bg-accent/90 hover:scale-110',
            'transition-all duration-150',
            'shadow-md border border-border',
            'cursor-pointer'
          )}
          style={{
            top: `${button.top}px`,
            left: `${button.left}px`,
            transform: 'translateX(-50%)',
          }}
          onClick={() => addColumnAfter(index)}
          onMouseDown={(e) => e.preventDefault()}
          title="Add column to the right"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      ))}
    </div>
  );
}
