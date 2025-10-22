'use client';

import { useFont } from '@/lib/context/FontContext';
import { cn } from '@/lib/utils';
import { Type, BookText, Accessibility } from 'lucide-react';
import { useSession } from 'next-auth/react';

type FontPreference = 'sans' | 'serif' | 'dyslexic';

interface FontOption {
  value: FontPreference;
  label: string;
  icon: typeof Type;
  previewClass: string;
}

export function FontSelector() {
  const { font, setFont } = useFont();
  const { data: session } = useSession();

  const options: FontOption[] = [
    {
      value: 'sans',
      label: 'Sans Serif',
      icon: Type,
      previewClass: 'font-[var(--font-content-sans)]',
    },
    {
      value: 'serif',
      label: 'Serif',
      icon: BookText,
      previewClass: 'font-[var(--font-content-serif)]',
    },
    {
      value: 'dyslexic',
      label: 'Dyslexic',
      icon: Accessibility,
      previewClass: 'font-[var(--font-content-dyslexic)]',
    },
  ];

  const handleFontChange = async (newFont: FontPreference) => {
    // Update font immediately (localStorage + state)
    setFont(newFont);

    // Only sync to database if user is authenticated
    if (session?.user) {
      try {
        const response = await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fontPreference: newFont }),
        });

        if (!response.ok) {
          console.error('Failed to save font preference to database');
        }
      } catch (error) {
        console.error('Error saving font preference:', error);
        // Don't block UI - localStorage is primary
      }
    }
  };

  return (
    <div className="space-y-[var(--spacing-sm)]">
      <h3 className="text-sm font-medium text-[var(--foreground)]">Font Type</h3>
      <p className="text-xs text-[var(--muted)] mb-[var(--spacing-sm)]">
        Choose a font that&apos;s comfortable for reading and writing
      </p>
      <div className="flex gap-[var(--spacing-sm)]">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = font === option.value;

          return (
            <button
              key={option.value}
              onClick={() => handleFontChange(option.value)}
              className={cn(
                'flex flex-col items-center justify-center',
                'gap-[var(--spacing-xs)]',
                'p-[var(--spacing-md)]',
                'rounded-[var(--radius-md)]',
                'border border-[var(--border)]',
                'transition-colors',
                'hover:bg-[var(--muted)]',
                'min-w-[120px]',
                isSelected && 'bg-[var(--accent)] text-[var(--accent-foreground)]',
                isSelected && 'hover:bg-[var(--accent)]',
                !isSelected && 'bg-[var(--background)] text-[var(--foreground)]'
              )}
              aria-label={`Set font to ${option.label}`}
              aria-pressed={isSelected}
            >
              <Icon className="h-5 w-5" />
              <span className={cn('text-sm', option.previewClass)}>
                {option.label}
              </span>
              <span className={cn('text-xs', option.previewClass)}>Aa</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
