'use client';

import { Eye, Edit3 } from 'lucide-react';
import { PermissionBadgeProps } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Badge component to display permission level (read/edit)
 */
export function PermissionBadge({
  permission,
  size = 'md',
}: PermissionBadgeProps) {
  const isEdit = permission === 'edit';

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded',
        sizeClasses[size],
        isEdit
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {isEdit ? (
        <>
          <Edit3 className={iconSizes[size]} />
          <span>Can Edit</span>
        </>
      ) : (
        <>
          <Eye className={iconSizes[size]} />
          <span>Can View</span>
        </>
      )}
    </span>
  );
}
