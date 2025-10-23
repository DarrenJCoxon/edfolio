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

  useEffect(() => {
    const editorElement = editor.view.dom;
    let rafId: number | null = null;
    let isHovering = false;

    const updateButtonPositions = (table: HTMLElement) => {
      const rows = Array.from(table.querySelectorAll('tr'));
      const tableRect = table.getBoundingClientRect();

      // Calculate row button positions (right side of table)
      const rowPositions = rows.map(row => {
        const rowRect = row.getBoundingClientRect();
        return {
          top: rowRect.top + rowRect.height / 2,
          left: tableRect.right + 8,
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
            top: tableRect.bottom + 8,
            left: cellRect.left + cellRect.width / 2,
          };
        });
        setColButtons(colPositions);
      }
    };

    const handleMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement;
      const table = target.closest('table');

      if (table && editor.isEditable) {
        isHovering = true;
        setHoveredTable(table);

        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
          updateButtonPositions(table);
        });
      }
    };

    const handleMouseLeave = (e: Event) => {
      const target = e.target as HTMLElement;
      const relatedTarget = (e as MouseEvent).relatedTarget as HTMLElement;

      // Check if we're leaving to a button or staying in table
      const leavingToButton = relatedTarget?.closest('.table-control-button');
      const stayingInTable = relatedTarget?.closest('table') === target.closest('table');

      if (!leavingToButton && !stayingInTable) {
        isHovering = false;
        setTimeout(() => {
          if (!isHovering) {
            setHoveredTable(null);
            setRowButtons([]);
            setColButtons([]);
          }
        }, 100);
      }
    };

    // Find all tables and attach listeners
    const tables = editorElement.querySelectorAll('table');
    tables.forEach(table => {
      table.addEventListener('mouseenter', handleMouseEnter);
      table.addEventListener('mouseleave', handleMouseLeave);
    });

    // Use MutationObserver to handle dynamically added tables
    const observer = new MutationObserver(() => {
      const newTables = editorElement.querySelectorAll('table');
      newTables.forEach(table => {
        table.removeEventListener('mouseenter', handleMouseEnter);
        table.removeEventListener('mouseleave', handleMouseLeave);
        table.addEventListener('mouseenter', handleMouseEnter);
        table.addEventListener('mouseleave', handleMouseLeave);
      });
    });

    observer.observe(editorElement, {
      childList: true,
      subtree: true,
    });

    return () => {
      tables.forEach(table => {
        table.removeEventListener('mouseenter', handleMouseEnter);
        table.removeEventListener('mouseleave', handleMouseLeave);
      });
      observer.disconnect();

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [editor]);

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

      // Update button positions after adding row
      setTimeout(() => {
        if (hoveredTable) {
          const rows = Array.from(hoveredTable.querySelectorAll('tr'));
          const tableRect = hoveredTable.getBoundingClientRect();
          const rowPositions = rows.map(row => {
            const rowRect = row.getBoundingClientRect();
            return {
              top: rowRect.top + rowRect.height / 2,
              left: tableRect.right + 8,
            };
          });
          setRowButtons(rowPositions);
        }
      }, 50);
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

      // Update button positions after adding column
      setTimeout(() => {
        if (hoveredTable) {
          const firstRow = hoveredTable.querySelector('tr');
          if (firstRow) {
            const cells = Array.from(firstRow.querySelectorAll('th, td'));
            const tableRect = hoveredTable.getBoundingClientRect();
            const colPositions = cells.map(cell => {
              const cellRect = cell.getBoundingClientRect();
              return {
                top: tableRect.bottom + 8,
                left: cellRect.left + cellRect.width / 2,
              };
            });
            setColButtons(colPositions);
          }
        }
      }, 50);
    }
  };

  if (!hoveredTable) return null;

  return (
    <>
      {/* Row add buttons - right side of table */}
      {rowButtons.map((button, index) => (
        <button
          key={`row-${index}`}
          className={cn(
            'table-control-button',
            'fixed z-50 flex items-center justify-center',
            'w-6 h-6 rounded-full',
            'bg-accent text-accent-foreground',
            'hover:bg-accent/90 hover:scale-110',
            'transition-all duration-150',
            'shadow-lg border border-border',
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
            'table-control-button',
            'fixed z-50 flex items-center justify-center',
            'w-6 h-6 rounded-full',
            'bg-accent text-accent-foreground',
            'hover:bg-accent/90 hover:scale-110',
            'transition-all duration-150',
            'shadow-lg border border-border',
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
    </>
  );
}
