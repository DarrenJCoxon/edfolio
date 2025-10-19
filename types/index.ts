// Core data types (will match Prisma models later)

export interface User {
  id: string;
  email: string;
  folios: Folio[];
}

export interface Folio {
  id: string;
  name: string;
  ownerId: string;
  folders?: Folder[];
  notes?: Note[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  folioId: string;
  parentId: string | null;
  children?: Folder[];
  notes?: Note[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content?: unknown;
  folioId: string;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Component prop types

export interface ActionRailProps {
  className?: string;
}

export interface FileNavigatorProps {
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export interface EditorViewProps {
  className?: string;
  note?: Note | null;
}

// Layout types

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AppState {
  theme: ThemeMode;
  activeNoteId: string | null;
  activeFolioId: string | null;
  sidebarCollapsed: boolean;
}
