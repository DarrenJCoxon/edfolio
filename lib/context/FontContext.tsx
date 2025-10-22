'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type FontPreference = 'sans' | 'serif' | 'dyslexic';

interface FontContextValue {
  font: FontPreference;
  setFont: (font: FontPreference) => void;
}

const FontContext = createContext<FontContextValue | undefined>(undefined);

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = useState<FontPreference>('sans');
  const [mounted, setMounted] = useState(false);

  // Initialize font from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('font') as FontPreference;
    if (stored && ['sans', 'serif', 'dyslexic'].includes(stored)) {
      setFontState(stored);
      applyFont(stored);
    }
  }, []);

  // Apply font to document
  useEffect(() => {
    if (mounted) {
      applyFont(font);
    }
  }, [font, mounted]);

  const applyFont = (selectedFont: FontPreference) => {
    const fontVarMap = {
      sans: 'var(--font-content-sans)',
      serif: 'var(--font-content-serif)',
      dyslexic: 'var(--font-content-dyslexic)',
    };

    document.documentElement.style.setProperty(
      '--font-content-active',
      fontVarMap[selectedFont]
    );
  };

  const setFont = (newFont: FontPreference) => {
    setFontState(newFont);
    if (mounted) {
      localStorage.setItem('font', newFont);
    }
  };

  return (
    <FontContext.Provider value={{ font, setFont }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFont must be used within FontProvider');
  }
  return context;
}
