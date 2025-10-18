import { ActionRail } from '@/components/navigation/ActionRail';
import { FileNavigator } from '@/components/navigation/FileNavigator';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-row h-screen overflow-hidden">
      <ActionRail />
      <FileNavigator />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
