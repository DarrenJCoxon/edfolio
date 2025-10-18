'use client';

import { Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ActionRailProps } from '@/types';
import { cn } from '@/lib/utils';

export function ActionRail({ className }: ActionRailProps) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between',
        'w-[var(--action-rail-width)] h-screen',
        'bg-[var(--card)] border-r border-[var(--border)]',
        className
      )}
    >
      {/* Top section */}
      <div className="flex flex-col items-center p-[var(--spacing-sm)] gap-[var(--spacing-sm)]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search"
                className="w-10 h-10"
              >
                <Search className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Search</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Bottom section */}
      <div className="flex flex-col items-center p-[var(--spacing-sm)] gap-[var(--spacing-sm)]">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Settings"
                className="w-10 h-10"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
