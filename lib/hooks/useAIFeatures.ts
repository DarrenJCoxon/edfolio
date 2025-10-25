'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { countWords } from '@/lib/editor/text-manipulation';
import type { RephraseResponse, SummarizeResponse, FixGrammarResponse } from '@/types';

export interface UseAIFeaturesOptions {
  activeNoteId: string | null;
  folioId: string | undefined;
  selectedText: string;
  editorInstance: unknown | null;
}

export interface UseAIFeaturesReturn {
  // State
  isProcessing: boolean;
  processingOption: string | null;
  showRephrasePreview: boolean;
  rephrasedText: string;
  originalText: string;
  showSummarizePreview: boolean;
  summary: string;
  showGrammarFixPreview: boolean;
  correctedText: string;
  hasGrammarChanges: boolean;
  isApplying: boolean;

  // Handlers
  handleOptionClick: (option: 'rephrase' | 'summarize' | 'fix-grammar') => Promise<void>;
  handleAcceptRephrase: () => Promise<void>;
  handleRejectRephrase: () => void;
  handleAcceptSummary: () => Promise<void>;
  handleRejectSummary: () => void;
  handleAcceptGrammarFix: () => Promise<void>;
  handleRejectGrammarFix: () => void;
}

export function useAIFeatures({
  activeNoteId,
  folioId,
  selectedText,
  editorInstance,
}: UseAIFeaturesOptions): UseAIFeaturesReturn {
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

  // Handle menu option clicks
  const handleOptionClick = useCallback(
    async (option: 'rephrase' | 'summarize' | 'fix-grammar') => {
      if (!selectedText || !activeNoteId || !folioId) {
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
              vaultId: folioId,
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
              vaultId: folioId,
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
              vaultId: folioId,
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
    [selectedText, activeNoteId, folioId]
  );

  // Handle accept rephrase
  const handleAcceptRephrase = useCallback(async () => {
    // Type assertion for editor instance
    const editor = editorInstance as {
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
      const { from, to } = editor.state.selection;
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, rephrasedText)
        .run();

      setShowRephrasePreview(false);
      setRephrasedText('');
      setOriginalText('');
    } catch (error) {
      toast.error('Failed to apply rephrased text');
    } finally {
      setIsApplying(false);
    }
  }, [editorInstance, rephrasedText]);

  // Handle reject rephrase
  const handleRejectRephrase = useCallback(() => {
    setShowRephrasePreview(false);
    setRephrasedText('');
    setOriginalText('');
  }, []);

  // Handle accept summary
  const handleAcceptSummary = useCallback(async () => {
    const editor = editorInstance as {
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
      const { from, to } = editor.state.selection;
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, summary)
        .run();

      setShowSummarizePreview(false);
      setSummary('');
      setOriginalText('');
    } catch (error) {
      toast.error('Failed to apply summary');
    } finally {
      setIsApplying(false);
    }
  }, [editorInstance, summary]);

  // Handle reject summary
  const handleRejectSummary = useCallback(() => {
    setShowSummarizePreview(false);
    setSummary('');
    setOriginalText('');
  }, []);

  // Handle accept grammar fix
  const handleAcceptGrammarFix = useCallback(async () => {
    const editor = editorInstance as {
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
      const { from, to } = editor.state.selection;
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, correctedText)
        .run();

      setShowGrammarFixPreview(false);
      setCorrectedText('');
      setHasGrammarChanges(false);
      setOriginalText('');
    } catch (error) {
      toast.error('Failed to apply grammar fix');
    } finally {
      setIsApplying(false);
    }
  }, [editorInstance, correctedText]);

  // Handle reject grammar fix
  const handleRejectGrammarFix = useCallback(() => {
    setShowGrammarFixPreview(false);
    setCorrectedText('');
    setHasGrammarChanges(false);
    setOriginalText('');
  }, []);

  return {
    // State
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

    // Handlers
    handleOptionClick,
    handleAcceptRephrase,
    handleRejectRephrase,
    handleAcceptSummary,
    handleRejectSummary,
    handleAcceptGrammarFix,
    handleRejectGrammarFix,
  };
}
