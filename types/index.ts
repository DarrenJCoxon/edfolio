// Core data types (match Prisma models)

export interface User {
  id: string;
  email: string;
  folios: Folio[];
}

export interface Folio {
  id: string;
  name: string;
  ownerId: string;
  folders: Folder[];
  notes: Note[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  folioId: string;
  parentId: string | null;
  children: Folder[];
  notes: Note[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: unknown; // TipTap JSON content
  folioId: string;
  folderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Auto-save types
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AutoSaveOptions {
  noteId: string;
  initialContent: unknown;
  delay?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

export interface AutoSaveReturn {
  saveStatus: SaveStatus;
  save: (content: unknown) => void;
  forceSave: () => Promise<void>;
  error: Error | null;
}

// TipTap Editor types
export interface TipTapEditorProps {
  content: unknown;
  onChange: (content: unknown) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
}

// Save Indicator types
export interface SaveIndicatorProps {
  status: SaveStatus;
  error?: Error | null;
  className?: string;
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

// Highlight Menu types

export interface HighlightMenuProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onOptionClick: (option: 'rephrase' | 'summarize' | 'fix-grammar') => void;
}

export interface MenuPosition {
  x: number;
  y: number;
}

export interface TextSelection {
  text: string;
  from: number;
  to: number;
}

// AI Rephrase types

export interface RephraseRequest {
  text: string;
  vaultId: string;
  noteId: string;
}

export interface RephraseResponse {
  data: {
    originalText: string;
    rephrasedText: string;
  };
}

export interface RephrasePreviewProps {
  isOpen: boolean;
  originalText: string;
  rephrasedText: string;
  onAccept: () => void;
  onReject: () => void;
  isApplying: boolean;
}

// AI Summarize types

export interface SummarizeRequest {
  text: string;
  vaultId: string;
  noteId: string;
}

export interface SummarizeResponse {
  data: {
    originalText: string;
    summary: string;
  };
}

export interface SummarizePreviewProps {
  isOpen: boolean;
  originalText: string;
  summary: string;
  onAccept: () => void;
  onReject: () => void;
  isApplying: boolean;
}

// User Settings types

export type SpellingPreference = 'UK' | 'US';

// AI Fix Grammar types

export interface FixGrammarRequest {
  text: string;
  vaultId: string;
  noteId: string;
}

export interface FixGrammarResponse {
  data: {
    originalText: string;
    correctedText: string;
    hasChanges: boolean;
  };
}

export interface GrammarFixPreviewProps {
  isOpen: boolean;
  originalText: string;
  correctedText: string;
  hasChanges: boolean;
  onAccept: () => void;
  onReject: () => void;
  isApplying: boolean;
}
