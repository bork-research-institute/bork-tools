'use client';
import { ChatButton } from '@/components/chat/chat-button';
import { ChatDialog } from '@/components/chat/chat-dialog';
import { useState } from 'react';

export function Chat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <ChatButton onOpenChat={() => setIsOpen(true)} />
      <ChatDialog isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
