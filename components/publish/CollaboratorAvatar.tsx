'use client';

import { CollaboratorAvatarProps } from '@/types';
import { PermissionBadge } from './PermissionBadge';

/**
 * Avatar component for displaying collaborator information
 */
export function CollaboratorAvatar({
  name,
  email,
  permission,
  lastAccessed,
}: CollaboratorAvatarProps) {
  // Get initials from name or email
  const getInitials = () => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Format last accessed date
  const formatLastAccessed = (date: Date) => {
    const now = Date.now();
    const diff = now - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return `${Math.floor(minutes / 1440)}d ago`;
  };

  return (
    <div className="flex items-center gap-3">
      {/* Avatar circle */}
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-medium text-sm">
        {getInitials()}
      </div>

      {/* Collaborator info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {name || email}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <PermissionBadge permission={permission} size="sm" />
          {lastAccessed && (
            <span className="text-xs text-muted">
              {formatLastAccessed(lastAccessed)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
