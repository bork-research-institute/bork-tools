'use client';
import type { PropsWithChildren } from 'react';
import { ChatBubble } from '../chat/ChatBubble';
import { Header } from '../header/header';

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <>
      <div className="min-h-screen bg-black">
        <Header />
        <main className="mx-auto max-w-7xl">{children}</main>
      </div>
      <ChatBubble />
    </>
  );
}
