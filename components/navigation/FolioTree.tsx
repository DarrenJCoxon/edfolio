'use client';

import { Folder, Note } from '@/types';
import { FolderItem } from './FolderItem';
import { NoteItem } from './NoteItem';
import { ItemContextMenu } from './ItemContextMenu';
import { FolderContextMenu } from './FolderContextMenu';
import { useState } from 'react';
import { toast } from 'sonner';

interface FolioTreeProps {
  folders: Folder[];
  notes: Note[];
  activeFolioId: string | null;
  activeNoteId: string | null;
  expandedFolderIds: Set<string>;
  onToggleFolderExpand: (id: string) => void;
  onSelectNote: (id: string) => void;
  onRename: (type: 'folder' | 'note', id: string, name: string) => void;
  onDelete: (type: 'folder' | 'note', id: string, name: string) => void;
  onCreateNote: (parentId?: string) => void;
  onCreateFolder: (parentId?: string) => void;
}

export function FolioTree({
  folders,
  notes,
  activeFolioId,
  activeNoteId,
  expandedFolderIds,
  onToggleFolderExpand,
  onSelectNote,
  onRename,
  onDelete,
  onCreateNote,
  onCreateFolder,
}: FolioTreeProps) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemType, setEditingItemType] = useState<'folder' | 'note' | null>(null);

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename folder');
      }

      // Update via parent handler
      onRename('folder', folderId, newName);
      setEditingItemId(null);
      setEditingItemType(null);
      toast.success('Folder renamed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename folder';
      toast.error(errorMessage);
      throw err; // Re-throw to let component handle it
    }
  };

  const handleRenameNote = async (noteId: string, newName: string) => {
    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename note');
      }

      // Update via parent handler
      onRename('note', noteId, newName);
      setEditingItemId(null);
      setEditingItemType(null);
      toast.success('Note renamed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to rename note';
      toast.error(errorMessage);
      throw err; // Re-throw to let component handle it
    }
  };

  const renderFolder = (folder: Folder, depth: number = 0): React.ReactElement => {
    const isExpanded = expandedFolderIds.has(folder.id);
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const childNotes = notes.filter((n) => n.folderId === folder.id);

    return (
      <div key={folder.id}>
        <FolderContextMenu
          onNewNote={() => onCreateNote(folder.id)}
          onNewFolder={() => onCreateFolder(folder.id)}
          onRename={() => {
            setEditingItemId(folder.id);
            setEditingItemType('folder');
          }}
          onDelete={() => onDelete('folder', folder.id, folder.name)}
        >
          <FolderItem
            folder={folder}
            depth={depth}
            isExpanded={isExpanded}
            onToggleExpand={onToggleFolderExpand}
            onRename={handleRenameFolder}
            isEditingExternally={editingItemId === folder.id && editingItemType === 'folder'}
            onStartEdit={() => {
              setEditingItemId(folder.id);
              setEditingItemType('folder');
            }}
          />
        </FolderContextMenu>

        {isExpanded && (
          <div>
            {childFolders.map((child) => renderFolder(child, depth + 1))}
            {childNotes.map((note) => (
              <ItemContextMenu
                key={note.id}
                onRename={() => {
                  setEditingItemId(note.id);
                  setEditingItemType('note');
                }}
                onDelete={() => onDelete('note', note.id, note.title)}
              >
                <NoteItem
                  note={note}
                  depth={depth + 1}
                  isActive={note.id === activeNoteId}
                  onClick={onSelectNote}
                  onRename={handleRenameNote}
                  isEditingExternally={editingItemId === note.id && editingItemType === 'note'}
                  onStartEdit={() => {
                    setEditingItemId(note.id);
                    setEditingItemType('note');
                  }}
                />
              </ItemContextMenu>
            ))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter(
    (f) => f.folioId === activeFolioId && !f.parentId
  );
  const rootNotes = notes.filter(
    (n) => n.folioId === activeFolioId && !n.folderId
  );

  return (
    <>
      {rootFolders.map((folder) => renderFolder(folder, 0))}
      {rootNotes.map((note) => (
        <ItemContextMenu
          key={note.id}
          onRename={() => {
            setEditingItemId(note.id);
            setEditingItemType('note');
          }}
          onDelete={() => onDelete('note', note.id, note.title)}
        >
          <NoteItem
            note={note}
            depth={0}
            isActive={note.id === activeNoteId}
            onClick={onSelectNote}
            onRename={handleRenameNote}
            isEditingExternally={editingItemId === note.id && editingItemType === 'note'}
            onStartEdit={() => {
              setEditingItemId(note.id);
              setEditingItemType('note');
            }}
          />
        </ItemContextMenu>
      ))}
    </>
  );
}
