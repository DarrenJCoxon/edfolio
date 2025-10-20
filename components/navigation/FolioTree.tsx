'use client';

import { Folder, Note } from '@/types';
import { FolderItem } from './FolderItem';
import { NoteItem } from './NoteItem';
import { ItemContextMenu } from './ItemContextMenu';

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
}: FolioTreeProps) {
  const renderFolder = (folder: Folder, depth: number = 0): React.ReactElement => {
    const isExpanded = expandedFolderIds.has(folder.id);
    const childFolders = folders.filter((f) => f.parentId === folder.id);
    const childNotes = notes.filter((n) => n.folderId === folder.id);

    return (
      <div key={folder.id}>
        <ItemContextMenu
          onRename={() => onRename('folder', folder.id, folder.name)}
          onDelete={() => onDelete('folder', folder.id, folder.name)}
        >
          <FolderItem
            folder={folder}
            depth={depth}
            isExpanded={isExpanded}
            onToggleExpand={onToggleFolderExpand}
          />
        </ItemContextMenu>

        {isExpanded && (
          <div>
            {childFolders.map((child) => renderFolder(child, depth + 1))}
            {childNotes.map((note) => (
              <ItemContextMenu
                key={note.id}
                onRename={() => onRename('note', note.id, note.title)}
                onDelete={() => onDelete('note', note.id, note.title)}
              >
                <NoteItem
                  note={note}
                  depth={depth + 1}
                  isActive={note.id === activeNoteId}
                  onClick={onSelectNote}
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
          onRename={() => onRename('note', note.id, note.title)}
          onDelete={() => onDelete('note', note.id, note.title)}
        >
          <NoteItem
            note={note}
            depth={0}
            isActive={note.id === activeNoteId}
            onClick={onSelectNote}
          />
        </ItemContextMenu>
      ))}
    </>
  );
}
