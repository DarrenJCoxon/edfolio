'use client';

import { ActionRail } from '@/components/navigation/ActionRail';
import { FileNavigator } from '@/components/navigation/FileNavigator';
import { MobileMenuButton } from '@/components/navigation/MobileMenuButton';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { useFoliosStore } from '@/lib/stores/folios-store';
import { useSwipeGesture } from '@/lib/hooks/useSwipeGesture';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const { mobileDrawerOpen, setMobileDrawerOpen, toggleMobileDrawer } =
    useFoliosStore();

  // Swipe from left edge to open drawer
  useSwipeGesture({
    onSwipeRight: () => {
      if (isMobile && !mobileDrawerOpen) {
        setMobileDrawerOpen(true);
      }
    },
    enabled: isMobile,
  });

  return (
    <div className="flex flex-row h-screen overflow-hidden">
      {/* Mobile Menu Button */}
      {isMobile && (
        <MobileMenuButton
          isOpen={mobileDrawerOpen}
          onToggle={toggleMobileDrawer}
        />
      )}

      {/* Action Rail - Hidden on mobile via CSS */}
      <ActionRail className="action-rail" />

      {/* File Navigator - Sidebar on desktop, Drawer on mobile */}
      <FileNavigator />

      {/* Main Content */}
      <main className="flex-1 editor-view">{children}</main>
    </div>
  );
}
