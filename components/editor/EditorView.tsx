'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TipTapEditor } from './TipTapEditor';
import { SaveIndicator } from './SaveIndicator';
import { HighlightMenu } from './HighlightMenu';
import { RephrasePreview } from './RephrasePreview';
import { SummarizePreview } from './SummarizePreview';
import { GrammarFixPreview } from './GrammarFixPreview';
import { PublishButton } from './PublishButton';
import { OutlineDrawer } from './OutlineDrawer';
import { TabBar } from './TabBar';
import { TabOverflowMenu } from './TabOverflowMenu';
import { CollaborationBanner } from './CollaborationBanner';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { useTabKeyboardShortcuts } from '@/lib/hooks/useTabKeyboardShortcuts';
import { useAIFeatures } from '@/lib/hooks/useAIFeatures';
import { useNotePublication } from '@/lib/hooks/useNotePublication';
import { useNoteLoading } from '@/lib/hooks/useNoteLoading';
import { useTextSelection } from '@/lib/hooks/useTextSelection';
import { EditorViewProps } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, PanelRightOpen, PanelRightClose, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFoliosStore } from '@/lib/stores/folios-store';
import { TipTapHeading } from './TipTapEditor';

export function EditorView({ className }: EditorViewProps) {
  // Local component state (drawer, headings, refs)
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('edfolio-outline-drawer-open');
      return saved === 'true';
    } catch {
      return false;
    }
  });
  const [headings, setHeadings] = useState<TipTapHeading[]>([]);
  const editorInstanceRef = useRef<unknown | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // Zustand store selectors
  const activeNoteId = useFoliosStore((state) => state.activeNoteId);
  const updateNote = useFoliosStore((state) => state.updateNote);
  const allOpenTabs = useFoliosStore((state) => state.openTabs);
  const activeFolioId = useFoliosStore((state) => state.activeFolioId);
  const closeTab = useFoliosStore((state) => state.closeTab);
  const closeAllTabs = useFoliosStore((state) => state.closeAllTabs);
  const setActiveNote = useFoliosStore((state) => state.setActiveNote);
  const getCachedNoteContent = useFoliosStore((state) => state.getCachedNoteContent);
  const cacheNoteContent = useFoliosStore((state) => state.cacheNoteContent);

  // Filter tabs for current folio
  const openTabs = useMemo(
    () => {
      if (!activeFolioId) return [];
      return allOpenTabs.filter((tab) =>
        tab.folioId === activeFolioId || tab.isShared === true
      );
    },
    [allOpenTabs, activeFolioId]
  );

  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [hasTabOverflow, setHasTabOverflow] = useState(false);
  const tabBarRef = useRef<HTMLDivElement | null>(null);

  // Custom hooks for extracted features
  const {
    noteContent,
    noteData,
    noteMeta,
    isLoading,
    error,
    handleTitleChange,
    handleReload,
  } = useNoteLoading({
    activeNoteId,
    getCachedNoteContent,
    cacheNoteContent,
    updateNote,
  });

  const {
    selectedText,
    showHighlightMenu,
    menuPosition,
    handleSelectionChange,
  } = useTextSelection({ activeNoteId });

  const {
    isPublished,
    publishedSlug,
    handlePublishSuccess,
    handleUnpublishSuccess,
  } = useNotePublication({ activeNoteId });

  const {
    isProcessing,
    processingOption,
    showRephrasePreview,
    rephrasedText,
    originalText,
    showSummarizePreview,
    summary,
    showGrammarFixPreview,
    correctedText,
    hasGrammarChanges,
    isApplying,
    handleOptionClick,
    handleAcceptRephrase,
    handleRejectRephrase,
    handleAcceptSummary,
    handleRejectSummary,
    handleAcceptGrammarFix,
    handleRejectGrammarFix,
  } = useAIFeatures({
    activeNoteId,
    folioId: noteData?.folioId,
    selectedText,
    editorInstance: editorInstanceRef.current,
  });

  // Auto-save hook
  const { saveStatus, save, forceSave, error: saveError } = useAutoSave({
    noteId: activeNoteId || '',
    initialContent: noteContent || {},
    delay: 500,
    onSaveSuccess: () => {},
    onSaveError: () => {},
  });

  // Handle content changes from editor
  const handleContentChange = useCallback(
    (content: unknown) => {
      if (activeNoteId) {
        cacheNoteContent(activeNoteId, content);
      }
      save(content);
    },
    [save, activeNoteId, cacheNoteContent]
  );

  // Handle editor ready callback
  const handleEditorReady = useCallback((editor: unknown) => {
    editorInstanceRef.current = editor;
  }, []);

  // Handle headings update from TipTap TableOfContents extension
  const handleHeadingsUpdate = useCallback((newHeadings: TipTapHeading[]) => {
    setHeadings(newHeadings);
  }, []);

  // Handle keyboard shortcut for manual save (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        forceSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [forceSave]);

  // Reset headings when switching notes
  useEffect(() => {
    setHeadings([]);
  }, [activeNoteId]);

  // Persist drawer state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('edfolio-outline-drawer-open', String(isDrawerOpen));
    } catch (error) {
      console.error('Failed to save drawer state:', error);
    }
  }, [isDrawerOpen]);

  // Handle heading click navigation (TipTap handles scrolling automatically)
  const handleHeadingClick = useCallback((headingId: string) => {
    const headingElement = document.getElementById(headingId);
    if (!headingElement) return;

    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const containerRect = scrollContainer.getBoundingClientRect();
    const headingRect = headingElement.getBoundingClientRect();
    const relativeTop = headingRect.top - containerRect.top + scrollContainer.scrollTop;

    scrollContainer.scrollTo({
      top: relativeTop - 80,
      behavior: 'smooth'
    });
  }, []);

  // Keyboard shortcuts for tabs
  useTabKeyboardShortcuts({
    openTabs,
    activeNoteId: activeNoteId || null,
    onSwitchTab: (index) => {
      const tab = openTabs[index];
      if (tab) {
        setActiveNote(tab.noteId);
      }
    },
    onCloseActiveTab: () => {
      if (activeNoteId) {
        closeTab(activeNoteId);
      }
    },
  });

  // Tab overflow detection
  useEffect(() => {
    if (!tabBarRef.current) return;

    const observer = new ResizeObserver(() => {
      if (!tabBarRef.current) return;
      const containerWidth = tabBarRef.current.offsetWidth;
      const tabsContainer = tabBarRef.current.querySelector('.scrollbar-hide');
      const tabsWidth = tabsContainer?.scrollWidth || 0;
      setHasTabOverflow(tabsWidth > containerWidth - 100);
    });

    observer.observe(tabBarRef.current);
    return () => observer.disconnect();
  }, [openTabs]);

  // Empty state
  if (!activeNoteId || openTabs.length === 0) {
    return (
      <div className={cn('flex-1 h-screen bg-[var(--background)] flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-[var(--spacing-md)] text-center">
          <FileText className="h-12 w-12 text-[var(--muted-foreground)]" />
          <p className="text-lg text-[var(--muted-foreground)]">Select a note to begin</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex-1 h-screen bg-[var(--background)] flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-[var(--spacing-md)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--muted)]" />
          <p className="text-sm text-[var(--muted)]">Loading note...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex-1 h-screen bg-[var(--background)] flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-[var(--spacing-md)] text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-lg font-medium text-[var(--foreground)]">Failed to load note</p>
          <p className="text-sm text-[var(--muted)]">{error}</p>
          <Button onClick={handleReload} variant="default">Reload</Button>
        </div>
      </div>
    );
  }

  // Main editor view
  return (
    <div className={cn('flex-1 h-screen flex flex-col bg-[var(--background)]', className)}>
      {/* Tab Bar */}
      {openTabs.length > 0 && (
        <div ref={tabBarRef}>
          <TabBar
            openTabs={openTabs}
            activeNoteId={activeNoteId}
            onTabClick={(noteId) => setActiveNote(noteId)}
            onTabClose={closeTab}
            onShowOverflowMenu={() => setShowOverflowMenu(true)}
            hasOverflow={hasTabOverflow}
            rightControls={
              <>
                <SaveIndicator status={saveStatus} error={saveError} />
                <PublishButton
                  noteId={activeNoteId}
                  isPublished={isPublished}
                  publishedSlug={publishedSlug}
                  onPublishSuccess={handlePublishSuccess}
                  onUnpublishSuccess={handleUnpublishSuccess}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                      className="outline-drawer-toggle p-[var(--spacing-xs)] hover:bg-[var(--muted)] rounded transition-colors"
                      aria-label="Toggle outline"
                    >
                      {isDrawerOpen ? (
                        <PanelRightClose className="h-5 w-5 text-[var(--muted-foreground)]" />
                      ) : (
                        <PanelRightOpen className="h-5 w-5 text-[var(--muted-foreground)]" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isDrawerOpen ? 'Close outline' : 'Open outline'}
                  </TooltipContent>
                </Tooltip>
              </>
            }
          />
        </div>
      )}

      {/* Tab Overflow Menu */}
      <TabOverflowMenu
        openTabs={openTabs}
        activeNoteId={activeNoteId}
        onTabClick={(noteId) => {
          setActiveNote(noteId);
          setShowOverflowMenu(false);
        }}
        onCloseAll={() => {
          closeAllTabs();
          setShowOverflowMenu(false);
        }}
        isOpen={showOverflowMenu}
        onOpenChange={setShowOverflowMenu}
        trigger={<div />}
      />

      {/* Collaboration Banner */}
      {noteMeta && !noteMeta.isOwner && noteMeta.collaboratorRole && (
        <CollaborationBanner
          role={noteMeta.collaboratorRole as 'editor' | 'viewer'}
          ownerName={noteMeta.ownerName}
        />
      )}

      {/* Editor content */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="max-w-4xl mx-auto p-[var(--spacing-xl)]">
          <TipTapEditor
            content={noteContent}
            onChange={handleContentChange}
            title={noteData?.title || ''}
            onTitleChange={handleTitleChange}
            isNewNote={false}
            onSelectionChange={handleSelectionChange}
            onEditorReady={handleEditorReady}
            onHeadingsUpdate={handleHeadingsUpdate}
            editable={true}
            placeholder="Start typing..."
          />
        </div>
      </ScrollArea>

      {/* Highlight Menu */}
      <HighlightMenu
        isVisible={showHighlightMenu}
        position={menuPosition}
        onOptionClick={handleOptionClick}
        isProcessing={isProcessing}
        processingOption={processingOption}
      />

      {/* Rephrase Preview Dialog */}
      <RephrasePreview
        isOpen={showRephrasePreview}
        originalText={originalText}
        rephrasedText={rephrasedText}
        onAccept={handleAcceptRephrase}
        onReject={handleRejectRephrase}
        isApplying={isApplying}
      />

      {/* Summarize Preview Dialog */}
      <SummarizePreview
        isOpen={showSummarizePreview}
        originalText={originalText}
        summary={summary}
        onAccept={handleAcceptSummary}
        onReject={handleRejectSummary}
        isApplying={isApplying}
      />

      {/* Grammar Fix Preview Dialog */}
      <GrammarFixPreview
        isOpen={showGrammarFixPreview}
        originalText={originalText}
        correctedText={correctedText}
        hasChanges={hasGrammarChanges}
        onAccept={handleAcceptGrammarFix}
        onReject={handleRejectGrammarFix}
        isApplying={isApplying}
      />

      {/* Outline Drawer */}
      <OutlineDrawer
        isOpen={isDrawerOpen}
        onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
        headings={headings}
        onHeadingClick={handleHeadingClick}
      />
    </div>
  );
}
