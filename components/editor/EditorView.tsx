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
import { EditorViewProps, RephraseResponse, SummarizeResponse, FixGrammarResponse, HeadingItem } from '@/types';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, PanelRightOpen, PanelRightClose, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFoliosStore } from '@/lib/stores/folios-store';
import { toast } from 'sonner';
import { calculateMenuPosition } from '@/lib/editor/menu-positioning';
import { countWords } from '@/lib/editor/text-manipulation';
import { extractHeadings, headingsHaveChanged } from '@/lib/editor/heading-extraction';
import { detectActiveHeading, scrollToHeadingPosition } from '@/lib/editor/active-heading-detection';
import { Editor } from '@tiptap/react';

export function EditorView({ className }: EditorViewProps) {
  const [noteContent, setNoteContent] = useState<unknown>(null);
  const [noteData, setNoteData] = useState<{ id: string; title: string; folioId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteMeta, setNoteMeta] = useState<{
    isOwner: boolean;
    collaboratorRole: string | null;
    canEdit: boolean;
    ownerName?: string;
  } | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingOption, setProcessingOption] = useState<string | null>(null);
  const [showRephrasePreview, setShowRephrasePreview] = useState(false);
  const [rephrasedText, setRephrasedText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [showSummarizePreview, setShowSummarizePreview] = useState(false);
  const [summary, setSummary] = useState('');
  const [showGrammarFixPreview, setShowGrammarFixPreview] = useState(false);
  const [correctedText, setCorrectedText] = useState('');
  const [hasGrammarChanges, setHasGrammarChanges] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => {
    // Load drawer state from localStorage on mount
    try {
      const saved = localStorage.getItem('edfolio-outline-drawer-open');
      return saved === 'true';
    } catch {
      return false; // Default to closed
    }
  });
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [scrollListenerActive, setScrollListenerActive] = useState(true);
  const editorInstanceRef = useRef<unknown | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  // Get activeNoteId directly from store instead of note prop
  // This allows shared notes (which aren't in the notes array) to work correctly
  const activeNoteId = useFoliosStore((state) => state.activeNoteId);
  const updateNote = useFoliosStore((state) => state.updateNote);

  // Tab management - select primitive values to avoid infinite re-renders
  const allOpenTabs = useFoliosStore((state) => state.openTabs);
  const activeFolioId = useFoliosStore((state) => state.activeFolioId);
  const closeTab = useFoliosStore((state) => state.closeTab);
  const closeAllTabs = useFoliosStore((state) => state.closeAllTabs);
  const setActiveNote = useFoliosStore((state) => state.setActiveNote);

  // Filter tabs for current folio with useMemo to maintain stable reference
  // We include shared tabs regardless of active folio so that shared documents
  // remain accessible even when user is viewing "Shared with Me" folio.
  // This implements the "Virtual Folio" approach where shared docs don't
  // require switching to the owner's folio context.
  const openTabs = useMemo(
    () => {
      // If no active folio, return empty array to show "Select a note to begin"
      if (!activeFolioId) return [];

      // Include tabs that:
      // 1. Belong to the current active folio, OR
      // 2. Are marked as shared (isShared: true)
      return allOpenTabs.filter((tab) =>
        tab.folioId === activeFolioId || tab.isShared === true
      );
    },
    [allOpenTabs, activeFolioId]
  );
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [hasTabOverflow, setHasTabOverflow] = useState(false);
  const tabBarRef = useRef<HTMLDivElement | null>(null);

  // Cache-related actions from store
  const getCachedNoteContent = useFoliosStore((state) => state.getCachedNoteContent);
  const cacheNoteContent = useFoliosStore((state) => state.cacheNoteContent);

  // Fetch note content when activeNoteId changes, with cache-first strategy
  useEffect(() => {
    if (!activeNoteId) {
      setNoteContent(null);
      setError(null);
      return;
    }

    // Check cache first for instant loading
    const cachedContent = getCachedNoteContent(activeNoteId);
    if (cachedContent !== null) {
      // Use cached content - instant load, no API call, no loading state
      setNoteContent(cachedContent);
      setIsLoading(false);
      setError(null);
      // Note: We still need to fetch metadata even with cached content
      // So we don't return early here for metadata
    }

    // Fetch from API (for metadata or if not cached)
    const fetchNote = async () => {
      if (cachedContent === null) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(`/api/notes/${activeNoteId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load note');
        }

        const { data, meta } = await response.json();

        // Cache the content for instant future access
        cacheNoteContent(activeNoteId, data.content);
        setNoteContent(data.content);

        // Store note data (id, title, folioId) for use in AI features and title display
        setNoteData({
          id: data.id,
          title: data.title,
          folioId: data.folioId,
        });

        // Store metadata about collaboration status
        if (meta) {
          setNoteMeta({
            ...meta,
            ownerName: data.folio?.owner?.name || undefined,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load note';
        setError(errorMessage);
        console.error('Error fetching note:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNote();
  }, [activeNoteId, getCachedNoteContent, cacheNoteContent]);

  // Initialize auto-save hook only when there's an active note and content is loaded
  const { saveStatus, save, forceSave, error: saveError } = useAutoSave({
    noteId: activeNoteId || '',
    initialContent: noteContent || {},
    delay: 500,
    onSaveSuccess: () => {
      // Note saved successfully
    },
    onSaveError: () => {
      // Handle save error silently
    },
  });

  // Handle content changes from editor
  const handleContentChange = useCallback(
    (content: unknown) => {
      setNoteContent(content);
      // Update cache to keep it in sync with edits
      if (activeNoteId) {
        cacheNoteContent(activeNoteId, content);
      }
      // Always call save - it will handle the check internally
      save(content);
    },
    [save, activeNoteId, cacheNoteContent]
  );

  // Handle text selection changes
  const handleSelectionChange = useCallback((text: string, hasSelection: boolean) => {
    if (hasSelection && text.trim().length > 0) {
      setSelectedText(text);
      // Calculate menu position based on selection
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const position = calculateMenuPosition(
          {
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          },
          { width: 280, height: 60 } // Menu dimensions
        );

        setMenuPosition(position);
        setShowHighlightMenu(true);
      }
    } else {
      setShowHighlightMenu(false);
      setSelectedText('');
    }
  }, []);

  // Handle editor ready callback
  const handleEditorReady = useCallback((editor: unknown) => {
    editorInstanceRef.current = editor;
  }, []);

  // Handle menu option clicks
  const handleOptionClick = useCallback(
    async (option: 'rephrase' | 'summarize' | 'fix-grammar') => {
      if (!selectedText || !activeNoteId || !noteData?.folioId) {
        toast.error('Unable to process text. Please try selecting text again.');
        return;
      }

      if (option === 'rephrase') {
        setIsProcessing(true);
        setProcessingOption(option);
        setOriginalText(selectedText);

        try {
          const response = await fetch('/api/ai/rephrase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: selectedText,
              vaultId: noteData.folioId,
              noteId: activeNoteId,
            }),
          });

          if (!response.ok) {
            const error = await response.json();

            // Handle specific error cases
            if (response.status === 401) {
              throw new Error('Please log in to use AI features');
            } else if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              throw new Error(
                `Too many requests. Please wait ${retryAfter || '60'} seconds.`
              );
            } else if (response.status === 500 || response.status === 503) {
              throw new Error('AI service is temporarily unavailable. Please try again later.');
            } else {
              throw new Error(error.error || 'Failed to rephrase text');
            }
          }

          const data: RephraseResponse = await response.json();
          setRephrasedText(data.data.rephrasedText);
          setShowRephrasePreview(true);
        } catch (error) {
          console.error('Rephrase error:', error);

          let errorMessage = 'Failed to rephrase text. Please try again.';

          if (error instanceof Error) {
            if (error.message.includes('Failed to fetch')) {
              errorMessage = 'Connection failed. Please check your internet connection.';
            } else {
              errorMessage = error.message;
            }
          }

          toast.error(errorMessage);
        } finally {
          setIsProcessing(false);
          setProcessingOption(null);
        }
      } else if (option === 'summarize') {
        // Validate minimum word count
        const wordCount = countWords(selectedText);
        if (wordCount < 50) {
          toast.error('Please select at least 50 words to summarize');
          return;
        }

        setIsProcessing(true);
        setProcessingOption(option);
        setOriginalText(selectedText);

        try {
          const response = await fetch('/api/ai/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: selectedText,
              vaultId: noteData.folioId,
              noteId: activeNoteId,
            }),
          });

          if (!response.ok) {
            const error = await response.json();

            // Handle specific error cases
            if (response.status === 401) {
              throw new Error('Please log in to use AI features');
            } else if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              throw new Error(
                `Too many requests. Please wait ${retryAfter || '60'} seconds.`
              );
            } else if (response.status === 500 || response.status === 503) {
              throw new Error('AI service is temporarily unavailable. Please try again later.');
            } else {
              throw new Error(error.error || 'Failed to summarize text');
            }
          }

          const data: SummarizeResponse = await response.json();
          setSummary(data.data.summary);
          setShowSummarizePreview(true);
        } catch (error) {
          console.error('Summarize error:', error);

          let errorMessage = 'Failed to summarize text. Please try again.';

          if (error instanceof Error) {
            if (error.message.includes('Failed to fetch')) {
              errorMessage = 'Connection failed. Please check your internet connection.';
            } else {
              errorMessage = error.message;
            }
          }

          toast.error(errorMessage);
        } finally {
          setIsProcessing(false);
          setProcessingOption(null);
        }
      } else if (option === 'fix-grammar') {
        setIsProcessing(true);
        setProcessingOption(option);
        setOriginalText(selectedText);

        try {
          const response = await fetch('/api/ai/fix-grammar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: selectedText,
              vaultId: noteData.folioId,
              noteId: activeNoteId,
            }),
          });

          if (!response.ok) {
            const error = await response.json();

            // Handle specific error cases
            if (response.status === 401) {
              throw new Error('Please log in to use AI features');
            } else if (response.status === 429) {
              const retryAfter = response.headers.get('Retry-After');
              throw new Error(
                `Too many requests. Please wait ${retryAfter || '60'} seconds.`
              );
            } else if (response.status === 500 || response.status === 503) {
              throw new Error('AI service is temporarily unavailable. Please try again later.');
            } else {
              throw new Error(error.error || 'Failed to fix grammar');
            }
          }

          const data: FixGrammarResponse = await response.json();
          setCorrectedText(data.data.correctedText);
          setHasGrammarChanges(data.data.hasChanges);
          setShowGrammarFixPreview(true);
        } catch (error) {
          console.error('Fix grammar error:', error);

          let errorMessage = 'Failed to fix grammar. Please try again.';

          if (error instanceof Error) {
            if (error.message.includes('Failed to fetch')) {
              errorMessage = 'Connection failed. Please check your internet connection.';
            } else {
              errorMessage = error.message;
            }
          }

          toast.error(errorMessage);
        } finally {
          setIsProcessing(false);
          setProcessingOption(null);
        }
      }
    },
    [selectedText, activeNoteId, noteData?.folioId]
  );

  // Handle accept rephrase
  const handleAcceptRephrase = useCallback(async () => {
    // Type assertion for editor instance
    const editor = editorInstanceRef.current as {
      state: { selection: { from: number; to: number } };
      chain: () => {
        focus: () => {
          deleteRange: (range: { from: number; to: number }) => {
            insertContentAt: (pos: number, content: string) => {
              run: () => void;
            };
          };
        };
      };
    } | null;

    if (!editor) {
      toast.error('Editor not ready. Please try again.');
      return;
    }

    setIsApplying(true);

    try {
      // Get current selection range
      const { from, to } = editor.state.selection;

      // Replace text in editor using TipTap chain API
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, rephrasedText)
        .run();

      // Auto-save will trigger via editor onChange
      setShowRephrasePreview(false);
      setShowHighlightMenu(false);
      toast.success('Text rephrased successfully');
    } catch (error) {
      console.error('Apply rephrase error:', error);
      toast.error('Failed to apply changes');
    } finally {
      setIsApplying(false);
    }
  }, [rephrasedText]);

  // Handle reject rephrase
  const handleRejectRephrase = useCallback(() => {
    setShowRephrasePreview(false);
    setRephrasedText('');
    setOriginalText('');
    // Keep highlight menu open so user can try again
  }, []);

  // Handle accept summary
  const handleAcceptSummary = useCallback(async () => {
    // Type assertion for editor instance
    const editor = editorInstanceRef.current as {
      state: { selection: { from: number; to: number } };
      chain: () => {
        focus: () => {
          deleteRange: (range: { from: number; to: number }) => {
            insertContentAt: (pos: number, content: string) => {
              run: () => void;
            };
          };
        };
      };
    } | null;

    if (!editor) {
      toast.error('Editor not ready. Please try again.');
      return;
    }

    setIsApplying(true);

    try {
      // Get current selection range
      const { from, to } = editor.state.selection;

      // Replace text in editor using TipTap chain API
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, summary)
        .run();

      // Auto-save will trigger via editor onChange
      setShowSummarizePreview(false);
      setShowHighlightMenu(false);
      toast.success('Text summarized successfully');
    } catch (error) {
      console.error('Apply summary error:', error);
      toast.error('Failed to apply summary');
    } finally {
      setIsApplying(false);
    }
  }, [summary]);

  // Handle reject summary
  const handleRejectSummary = useCallback(() => {
    setShowSummarizePreview(false);
    setSummary('');
    // Keep highlight menu open so user can try again
  }, []);

  // Handle accept grammar fix
  const handleAcceptGrammarFix = useCallback(async () => {
    // Type assertion for editor instance
    const editor = editorInstanceRef.current as {
      state: { selection: { from: number; to: number } };
      chain: () => {
        focus: () => {
          deleteRange: (range: { from: number; to: number }) => {
            insertContentAt: (pos: number, content: string) => {
              run: () => void;
            };
          };
        };
      };
    } | null;

    if (!editor) {
      toast.error('Editor not ready. Please try again.');
      return;
    }

    setIsApplying(true);

    try {
      // Get current selection range
      const { from, to } = editor.state.selection;

      // Replace text in editor using TipTap chain API
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, correctedText)
        .run();

      // Auto-save will trigger via editor onChange
      setShowGrammarFixPreview(false);
      setShowHighlightMenu(false);
      toast.success('Grammar and spelling corrected');
    } catch (error) {
      console.error('Apply grammar fix error:', error);
      toast.error('Failed to apply corrections');
    } finally {
      setIsApplying(false);
    }
  }, [correctedText]);

  // Handle reject grammar fix
  const handleRejectGrammarFix = useCallback(() => {
    setShowGrammarFixPreview(false);
    setCorrectedText('');
    setHasGrammarChanges(false);
    // Keep highlight menu open so user can try again
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

  // Handle click outside menu to dismiss
  useEffect(() => {
    if (!showHighlightMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const menuElement = document.querySelector('.highlight-menu');
      if (menuElement && !menuElement.contains(event.target as Node)) {
        setShowHighlightMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHighlightMenu]);

  // Hide menu when note changes
  useEffect(() => {
    setShowHighlightMenu(false);
  }, [activeNoteId]);

  // Fetch publication status when note changes
  useEffect(() => {
    if (!activeNoteId) {
      setIsPublished(false);
      setPublishedSlug(null);
      return;
    }

    const fetchPublicationStatus = async () => {
      try {
        const response = await fetch(`/api/notes/${activeNoteId}/publish/status`);

        if (!response.ok) {
          // If error fetching status, assume not published
          setIsPublished(false);
          setPublishedSlug(null);
          return;
        }

        const data = await response.json();
        setIsPublished(data.isPublished);
        setPublishedSlug(data.slug);
      } catch (error) {
        console.error('Error fetching publication status:', error);
        setIsPublished(false);
        setPublishedSlug(null);
      }
    };

    fetchPublicationStatus();
  }, [activeNoteId]);

  // Handle reload button click
  const handleReload = () => {
    if (activeNoteId) {
      window.location.reload();
    }
  };

  // Handle title change from InlineTitleField
  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      if (!activeNoteId) return;

      try {
        const response = await fetch(`/api/notes/${activeNoteId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: newTitle }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update title');
        }

        // Update local state
        updateNote(activeNoteId, { title: newTitle });
        // Also update noteData state for immediate UI update
        setNoteData(prev => prev ? { ...prev, title: newTitle } : null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update title';
        toast.error(errorMessage);
        console.error('Error updating title:', err);
      }
    },
    [activeNoteId, updateNote]
  );

  // Handle successful publish
  const handlePublishSuccess = useCallback((slug: string) => {
    setIsPublished(true);
    setPublishedSlug(slug);
  }, []);

  // Handle successful unpublish
  const handleUnpublishSuccess = useCallback(() => {
    setIsPublished(false);
    setPublishedSlug(null);
  }, []);

  // Extract headings when editor content changes (debounced)
  useEffect(() => {
    if (!editorInstanceRef.current || !noteContent) return;

    const extractTimer = setTimeout(() => {
      const editor = editorInstanceRef.current as Editor;
      const newHeadings = extractHeadings(editor);

      // Only update if headings actually changed (prevent unnecessary re-renders)
      setHeadings((prevHeadings) => {
        if (headingsHaveChanged(newHeadings, prevHeadings)) {
          return newHeadings;
        }
        return prevHeadings;
      });
    }, 300); // Debounce 300ms

    return () => clearTimeout(extractTimer);
  }, [noteContent]);

  // Persist drawer state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('edfolio-outline-drawer-open', String(isDrawerOpen));
    } catch (error) {
      console.error('Failed to save drawer state:', error);
    }
  }, [isDrawerOpen]);

  // Detect active heading on scroll (debounced)
  useEffect(() => {
    if (!scrollListenerActive || headings.length === 0) return;

    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    let scrollTimer: NodeJS.Timeout;

    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const scrollTop = scrollContainer.scrollTop;
        const newActiveId = detectActiveHeading(headings, scrollTop);

        if (newActiveId !== activeHeadingId) {
          setActiveHeadingId(newActiveId);
        }
      }, 100); // Debounce 100ms
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimer);
    };
  }, [headings, activeHeadingId, scrollListenerActive]);

  // Handle heading click navigation
  const handleHeadingClick = useCallback((headingId: string) => {
    const heading = headings.find(h => h.id === headingId);
    if (!heading) return;

    const editor = editorInstanceRef.current as Editor;
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!editor || !scrollContainer) return;

    // Get DOM node at the ProseMirror document position
    const domNode = editor.view.domAtPos(heading.position);
    if (!domNode.node) return;

    // Find the actual heading element (either the node itself or its parent)
    let headingElement = domNode.node.nodeType === Node.ELEMENT_NODE
      ? domNode.node as HTMLElement
      : (domNode.node.parentElement as HTMLElement);

    // Walk up to find the actual heading tag (h1, h2, h3)
    while (headingElement && !['H1', 'H2', 'H3'].includes(headingElement.tagName)) {
      headingElement = headingElement.parentElement as HTMLElement;
      if (!headingElement || headingElement === scrollContainer) return;
    }

    if (!headingElement) return;

    // Get position relative to scroll container
    const containerRect = scrollContainer.getBoundingClientRect();
    const headingRect = headingElement.getBoundingClientRect();
    const relativeTop = headingRect.top - containerRect.top + scrollContainer.scrollTop;

    // Scroll to position with 80px offset for comfortable spacing at viewport top
    scrollContainer.scrollTo({
      top: relativeTop - 80,
      behavior: 'smooth'
    });

    // Set active heading immediately
    setActiveHeadingId(headingId);

    // Temporarily disable scroll listener to prevent interference
    setScrollListenerActive(false);

    // Re-enable after scroll completes
    setTimeout(() => {
      setScrollListenerActive(true);
    }, 500);
  }, [headings]);

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

      // Set overflow if tabs width exceeds container width (with 100px buffer for overflow button)
      setHasTabOverflow(tabsWidth > containerWidth - 100);
    });

    observer.observe(tabBarRef.current);

    return () => observer.disconnect();
  }, [openTabs]);

  // Empty state - no note selected or no tabs open
  if (!activeNoteId || openTabs.length === 0) {
    return (
      <div
        className={cn(
          'flex-1 h-screen',
          'bg-[var(--background)]',
          'flex items-center justify-center',
          className
        )}
      >
        <div className="flex flex-col items-center gap-[var(--spacing-md)] text-center">
          <FileText className="h-12 w-12 text-[var(--muted-foreground)]" />
          <p className="text-lg text-[var(--muted-foreground)]">
            Select a note to begin
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex-1 h-screen',
          'bg-[var(--background)]',
          'flex items-center justify-center',
          className
        )}
      >
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
      <div
        className={cn(
          'flex-1 h-screen',
          'bg-[var(--background)]',
          'flex items-center justify-center',
          className
        )}
      >
        <div className="flex flex-col items-center gap-[var(--spacing-md)] max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-[var(--destructive)]" />
          <p className="text-lg font-semibold text-[var(--foreground)]">
            Failed to load note
          </p>
          <p className="text-sm text-[var(--muted)]">{error}</p>
          <Button
            onClick={handleReload}
            variant="outline"
            className="mt-[var(--spacing-sm)]"
          >
            Reload
          </Button>
        </div>
      </div>
    );
  }

  // Main editor view
  return (
    <div
      className={cn(
        'flex-1 h-screen flex flex-col',
        'bg-[var(--background)]',
        className
      )}
    >
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

      {/* Collaboration Banner - Show when user is accessing shared note */}
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
        activeHeadingId={activeHeadingId}
        onHeadingClick={handleHeadingClick}
      />
    </div>
  );
}
