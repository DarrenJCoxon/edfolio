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

/**
 * User's preferred spelling variant for all AI features.
 * - UK: British English (colour, realise, analyse)
 * - US: American English (color, realize, analyze)
 */
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

// Publishing types

/**
 * Response after successfully publishing a note
 */
export interface PublishResponse {
  data: {
    slug: string;
    shortId: string;
    publicUrl: string;
  };
}

/**
 * Response for publication status check
 */
export interface PublicationStatusResponse {
  isPublished: boolean;
  slug: string | null;
}

/**
 * Props for PublicPageLayout component
 */
export interface PublicPageLayoutProps {
  title: string;
  content: unknown; // TipTap JSON content
  publishedAt: Date;
}

/**
 * Props for PublishButton component
 */
export interface PublishButtonProps {
  noteId: string;
  isPublished: boolean;
  publishedSlug?: string | null;
  onPublishSuccess: (slug: string) => void;
  onUnpublishSuccess: () => void;
}

/**
 * Props for UnpublishConfirmDialog component
 */
export interface UnpublishConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  publicUrl: string;
}

// Outline Drawer types

/**
 * Represents a heading item extracted from the document
 */
export interface HeadingItem {
  id: string;
  level: 1 | 2 | 3;
  text: string;
  position: number;
}

/**
 * Props for OutlineDrawer component
 */
export interface OutlineDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  headings: HeadingItem[];
  activeHeadingId: string | null;
  onHeadingClick: (headingId: string) => void;
}

// Page Sharing & Collaboration types (Story 3.2)

/**
 * Permission level for page shares
 */
export type SharePermission = 'read' | 'edit';

/**
 * Status of a page share
 */
export type ShareStatus = 'active' | 'revoked';

/**
 * Page share record
 */
export interface PageShare {
  id: string;
  pageId: string;
  invitedEmail: string;
  invitedBy: string;
  permission: SharePermission;
  accessToken: string;
  expiresAt: Date | null;
  createdAt: Date;
  lastAccessedAt: Date | null;
  accessCount: number;
  status: ShareStatus;
}

/**
 * Request body for creating a share
 */
export interface CreateShareRequest {
  invitedEmail: string;
  permission: SharePermission;
  expiresAt?: string;
}

/**
 * Request body for updating a share
 */
export interface UpdateShareRequest {
  permission?: SharePermission;
  status?: ShareStatus;
}

/**
 * Response after creating a share
 */
export interface CreateShareResponse {
  data: {
    id: string;
    invitedEmail: string;
    permission: SharePermission;
    accessLink: string;
    expiresAt: Date | null;
  };
}

/**
 * Response for share list
 */
export interface ShareListResponse {
  data: PageShare[];
}

/**
 * Props for ShareManagementModal component
 */
export interface ShareManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle: string;
  publicSlug: string;
}

/**
 * Props for PermissionBadge component
 */
export interface PermissionBadgeProps {
  permission: SharePermission;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Props for CloneButton component
 */
export interface CloneButtonProps {
  noteId: string;
  noteTitle: string;
  accessToken?: string;
}

/**
 * Clone page request
 */
export interface ClonePageRequest {
  accessToken?: string;
}

/**
 * Clone page response
 */
export interface ClonePageResponse {
  data: {
    noteId: string;
    title: string;
    redirectUrl: string;
  };
}

/**
 * Access token validation request
 */
export interface ValidateAccessRequest {
  accessToken: string;
}

/**
 * Access token validation response
 */
export interface ValidateAccessResponse {
  valid: boolean;
  permission?: SharePermission;
  pageData?: {
    id: string;
    title: string;
    slug: string;
    content: unknown;
  };
  error?: string;
}

/**
 * Collaborator info for display
 */
export interface CollaboratorInfo {
  userId: string;
  email: string;
  name: string | null;
  role: 'owner' | 'editor';
  lastEditedAt: Date | null;
}

/**
 * Props for CollaboratorAvatar component
 */
export interface CollaboratorAvatarProps {
  name: string | null;
  email: string;
  permission: SharePermission;
  lastAccessed?: Date | null;
}

/**
 * Email template data for share invitation
 */
export interface ShareInvitationEmailData {
  toEmail: string;
  fromUserName: string;
  pageTitle: string;
  accessLink: string;
  permission: SharePermission;
  expiryDate?: Date;
}

/**
 * Email template data for permission change
 */
export interface PermissionChangedEmailData {
  toEmail: string;
  pageTitle: string;
  oldPermission: SharePermission;
  newPermission: SharePermission;
}

/**
 * Email template data for access revocation
 */
export interface AccessRevokedEmailData {
  toEmail: string;
  pageTitle: string;
  revokedBy: string;
}
