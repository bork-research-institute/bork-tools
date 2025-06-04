import { Chat } from '@/components/chat/chat';
import { Header } from '@/components/header/header';
import { TutorialProvider } from '@/contexts/tutorial-context';
import type { PropsWithChildren } from 'react';

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <TutorialProvider>
      <div className="min-h-screen bg-black">
        <Header />
        <main className="mx-auto max-w-7xl">{children}</main>
      </div>
      <Chat />
    </TutorialProvider>
  );
}
