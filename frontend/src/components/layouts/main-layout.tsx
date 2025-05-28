import { AuthGuard } from '@/components/auth/auth-guard';
import { ChatBubble } from '@/components/chat/ChatBubble';
import { Header } from '@/components/header/header';
import type { PropsWithChildren } from 'react';

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-black">
        <Header />
        <main className="mx-auto max-w-7xl">{children}</main>
      </div>
      <ChatBubble />
    </AuthGuard>
  );
}
