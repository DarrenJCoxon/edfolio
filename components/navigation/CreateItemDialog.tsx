'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CreateItemDialogProps {
  type: 'folio' | 'folder' | 'note';
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function CreateItemDialog({
  type,
  isOpen,
  onClose,
  onCreate,
}: CreateItemDialogProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsLoading(true);
    try {
      await onCreate(name.trim());
      setName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  const getTitle = () => {
    switch (type) {
      case 'folio':
        return 'Create New Folio';
      case 'folder':
        return 'Create New Folder';
      case 'note':
        return 'Create New Note';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'folio':
        return 'Enter a name for your new folio.';
      case 'folder':
        return 'Enter a name for your new folder.';
      case 'note':
        return 'Enter a title for your new note.';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>{getDescription()}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-[var(--spacing-md)] py-[var(--spacing-md)]">
            <div className="grid gap-[var(--spacing-sm)]">
              <Label htmlFor="name">
                {type === 'note' ? 'Title' : 'Name'}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Enter ${type} ${type === 'note' ? 'title' : 'name'}...`}
                disabled={isLoading}
                autoFocus
              />
              {error && (
                <p className="text-sm text-[var(--destructive)]">{error}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
