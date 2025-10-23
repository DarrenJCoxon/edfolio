import { useEffect } from 'react';

interface UseTabKeyboardShortcutsOptions {
  openTabs: Array<{ noteId: string; title: string }>;
  activeNoteId: string | null;
  onSwitchTab: (index: number) => void;
  onCloseActiveTab: () => void;
}

export function useTabKeyboardShortcuts({
  openTabs,
  activeNoteId,
  onSwitchTab,
  onCloseActiveTab,
}: UseTabKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Check if Cmd (Mac) or Ctrl (Windows/Linux)
      const isModifierPressed = e.metaKey || e.ctrlKey;

      if (!isModifierPressed) return;

      // Ignore if user is typing in input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      // Handle Cmd/Ctrl+W (close active tab)
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault(); // Prevent closing browser tab
        onCloseActiveTab();
        return;
      }

      // Handle Cmd/Ctrl+1 through Cmd/Ctrl+9 (switch to tab by index)
      const numberKey = parseInt(e.key);
      if (numberKey >= 1 && numberKey <= 9) {
        e.preventDefault();
        const tabIndex = numberKey - 1; // Convert to 0-based index

        if (tabIndex < openTabs.length) {
          onSwitchTab(tabIndex);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openTabs, activeNoteId, onSwitchTab, onCloseActiveTab]);
}
