'use client';

import { useTheme } from '@/lib/context/ThemeContext';
import { cn } from '@/lib/utils';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useSession } from 'next-auth/react';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();

  const options: ThemeOption[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const handleThemeChange = async (newTheme: ThemePreference) => {
    // Update theme immediately (localStorage + state)
    setTheme(newTheme);

    // Only sync to database if user is authenticated
    if (session?.user) {
      // Sync to database (optimistic update - don't block UI)
      try {
        const response = await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themePreference: newTheme }),
        });

        if (!response.ok) {
          // Silently fail - localStorage is primary, database sync is secondary
          // User experience is not affected as theme still changes via localStorage
        }
      } catch {
        // Don't block UI - localStorage is primary
        // Database sync failure doesn't affect immediate theme change
      }
    }
  };

  return (
    <div className="space-y-[var(--spacing-sm)]">
      <h3 className="text-sm font-medium text-[var(--foreground)]">Theme</h3>
      <div className="flex gap-[var(--spacing-sm)]">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = theme === option.value;

          return (
            <button
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              className={cn(
                'flex flex-col items-center justify-center',
                'gap-[var(--spacing-xs)]',
                'p-[var(--spacing-md)]',
                'rounded-[var(--radius-md)]',
                'border border-[var(--border)]',
                'transition-colors',
                'hover:bg-[var(--muted)]',
                isSelected && 'bg-[var(--accent)] text-[var(--accent-foreground)]',
                isSelected && 'hover:bg-[var(--accent)]',
                !isSelected && 'bg-[var(--background)] text-[var(--foreground)]'
              )}
              aria-label={`Set theme to ${option.label}`}
              aria-pressed={isSelected}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
