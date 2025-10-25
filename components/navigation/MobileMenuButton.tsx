'use client';

import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MobileMenuButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * MobileMenuButton - A mobile-only hamburger menu button that triggers the navigation drawer
 *
 * This button appears fixed in the top-left corner on mobile devices (< 768px) and is
 * hidden on desktop. It meets the 44x44px minimum touch target size for mobile UX.
 *
 * @param isOpen - Whether the mobile drawer is currently open
 * @param onToggle - Callback function to toggle drawer visibility
 * @param className - Optional additional CSS classes
 */
export function MobileMenuButton({
  isOpen,
  onToggle,
  className,
}: MobileMenuButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      className={cn(
        'fixed top-4 left-4 z-[60]',
        'w-11 h-11', // 44px touch target
        'bg-card border border-border',
        'shadow-lg',
        'md:hidden', // Hide on desktop
        className
      )}
    >
      {isOpen ? (
        <X className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Menu className="h-5 w-5" aria-hidden="true" />
      )}
    </Button>
  );
}
