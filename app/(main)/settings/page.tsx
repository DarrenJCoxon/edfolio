'use client';

import { ThemeSwitcher } from '@/components/settings/ThemeSwitcher';
import { FontSelector } from '@/components/settings/FontSelector';
import { SpellingSettings } from '@/components/settings/SpellingSettings';
import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

// Force dynamic rendering to prevent static generation
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-[var(--spacing-xl)]">
        <div className="flex items-center gap-[var(--spacing-md)] mb-[var(--spacing-lg)]">
          <Link
            href="/"
            className="flex items-center gap-[var(--spacing-xs)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-[var(--spacing-lg)]">
          Settings
        </h1>

        <div className="space-y-[var(--spacing-xl)]">
          <section className="border-b border-[var(--border)] pb-[var(--spacing-lg)]">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-[var(--spacing-md)]">
              Appearance
            </h2>
            <div className="space-y-[var(--spacing-lg)]">
              <ThemeSwitcher />
              <FontSelector />
            </div>
          </section>

          <section className="border-b border-[var(--border)] pb-[var(--spacing-lg)]">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-[var(--spacing-md)]">
              Preferences
            </h2>
            <SpellingSettings />
          </section>

          <section className="pb-[var(--spacing-lg)]">
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-[var(--spacing-md)]">
              Account
            </h2>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-[var(--spacing-sm)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/10 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
