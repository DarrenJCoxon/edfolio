'use client';

import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollaborationBannerProps {
  role: 'editor' | 'viewer' | 'owner';
  ownerName?: string;
  className?: string;
}

export function CollaborationBanner({
  role,
  ownerName,
  className,
}: CollaborationBannerProps) {
  const getRoleDisplay = () => {
    switch (role) {
      case 'owner':
        return { text: 'You are the owner', color: 'text-foreground' };
      case 'editor':
        return {
          text: 'Editing as collaborator - Editor',
          color: 'text-accent',
        };
      case 'viewer':
        return {
          text: 'Viewing as collaborator - Viewer',
          color: 'text-muted-foreground',
        };
    }
  };

  const { text, color } = getRoleDisplay();

  return (
    <div
      className={cn(
        'flex items-center gap-[var(--spacing-sm)]',
        'px-[var(--spacing-md)] py-[var(--spacing-sm)]',
        'bg-muted/30 border-b border-border',
        className
      )}
    >
      <Users className={cn('h-4 w-4', color)} />
      <span className={cn('text-sm font-medium', color)}>{text}</span>
      {ownerName && role !== 'owner' && (
        <>
          <span className="text-sm text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">
            Owner: {ownerName}
          </span>
        </>
      )}
    </div>
  );
}
