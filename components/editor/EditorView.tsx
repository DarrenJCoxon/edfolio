'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { EditorViewProps } from '@/types';
import { cn } from '@/lib/utils';

export function EditorView({ className }: EditorViewProps) {
  return (
    <div
      className={cn(
        'flex-1 h-screen',
        'bg-[var(--background)]',
        className
      )}
    >
      <ScrollArea className="h-full">
        <div className="max-w-4xl mx-auto p-[var(--spacing-xl)]">
          {/* Placeholder content */}
          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-[var(--spacing-md)]">
            Welcome to edfolio
          </h1>
          <p className="text-lg text-[var(--muted)] mb-[var(--spacing-lg)]">
            Your educational portfolio platform.
          </p>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-[var(--foreground)]">
              This is the main editor view. In the next story, we&apos;ll integrate
              TipTap for rich text editing with auto-save functionality.
            </p>
            <p className="text-[var(--foreground)]">
              For now, this placeholder demonstrates the three-panel layout:
            </p>
            <ul className="text-[var(--foreground)]">
              <li><strong>Action Rail</strong> - The leftmost vertical rail with global actions</li>
              <li><strong>File Navigator</strong> - The sidebar for managing your folio structure</li>
              <li><strong>Editor View</strong> - This main area for writing and editing</li>
            </ul>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
