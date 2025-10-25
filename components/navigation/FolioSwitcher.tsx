'use client';

import { useState } from 'react';
import { useFoliosStore } from '@/lib/stores/folios-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Plus, Users } from 'lucide-react';
import { CreateItemDialog } from './CreateItemDialog';
import { cn } from '@/lib/utils';
import { fetchWithCsrf } from '@/lib/fetch-with-csrf';

export function FolioSwitcher() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { folios, activeFolioId, setActiveFolio, addFolio } = useFoliosStore();

  const activeFolio = folios.find((f) => f.id === activeFolioId);

  const handleCreateFolio = async (name: string) => {
    try {
      const response = await fetchWithCsrf('/api/folios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || 'Failed to create folio');
      }

      const { data } = await response.json();
      addFolio({
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      });
      setActiveFolio(data.id);
    } catch (error) {
      console.error('Failed to create folio:', error);
      throw error;
    }
  };

  const handleFolioSwitch = (folioId: string) => {
    setActiveFolio(folioId);
  };

  return (
    <>
      <div className="border-t border-[var(--border)] p-[var(--spacing-sm)]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-label="Switch folio"
              className={cn(
                'w-full justify-between',
                'hover:bg-[var(--muted)]/10'
              )}
            >
              <span className="truncate">
                {activeFolio?.name || 'Select folio'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Folios</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {folios.map((folio) => (
              <DropdownMenuItem
                key={folio.id}
                onClick={() => handleFolioSwitch(folio.id)}
                className={cn(
                  activeFolio?.id === folio.id && 'bg-[var(--accent)]/10'
                )}
              >
                {folio.id === '__shared__' && (
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                )}
                <span className="truncate">{folio.name}</span>
                {folio.id === '__shared__' && folio.shareCount && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {folio.shareCount}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Create Folio</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreateItemDialog
        type="folio"
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateFolio}
      />
    </>
  );
}
