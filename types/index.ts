// Core data types (will match Prisma models later)

export interface User {
  id: string;
  email: string;
  vaults: Vault[];
}

export interface Vault {
  id: string;
  name: string;
  ownerId: string;
  folders: Folder[];
  notes: Note[];
}

export interface Folder {
  id: string;
  name: string;
  vaultId: string;
  parentId: string | null;
  children: Folder[];
  notes: Note[];
}

export interface Note {
  id: string;
  title: string;
  content: unknown; // TipTap JSON content
  updatedAt: Date;
  vaultId: string;
  folderId: string | null;
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
  activeVaultId: string | null;
  sidebarCollapsed: boolean;
}
