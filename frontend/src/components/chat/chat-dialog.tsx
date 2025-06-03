'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { postMessage } from '@/lib/services/post-message';
import { useWallet } from '@solana/wallet-adapter-react';
import { Send } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatDialog({ isOpen, onOpenChange }: ChatDialogProps) {
  const { publicKey } = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  useEffect(() => {
    if (isOpen && !hasShownWelcome) {
      const welcomeMessage: Message = {
        id: 'welcome',
        content:
          "Hey anon! I'm bork - here to help you navigate the markets. What's on your mind?",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setHasShownWelcome(true);
    }
  }, [isOpen, hasShownWelcome]);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      return;
    }

    const newMessage: Message = {
      id: Math.random().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput('');

    setIsLoading(true);
    try {
      const response = await postMessage(input, publicKey?.toString() ?? '');
      for (const message of response) {
        const newMessage: Message = {
          id: Math.random().toString(),
          content: message.text,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Math.random().toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] h-[600px] flex flex-col gap-4 p-0 bg-black/90 border-white/10">
        <DialogTitle className="sr-only">Chat with Bork</DialogTitle>
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div className="relative h-10 w-10 rounded-full overflow-hidden">
            <Image
              src="/assets/Borksticker.webp"
              alt="Bork"
              fill={true}
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Bork</h2>
            <p className="text-sm text-gray-400">Your market companion</p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!message.isUser && (
                  <div className="relative h-8 w-8 rounded-full overflow-hidden mr-2 mt-1">
                    <Image
                      src="/assets/Borksticker.webp"
                      alt="Bork"
                      fill={true}
                      className="object-cover"
                    />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isUser
                      ? 'bg-gray-600 text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className={'flex justify-start'}>
                <div className="relative h-8 w-8 rounded-full overflow-hidden mr-2 mt-1">
                  <Image
                    src="/assets/Borksticker.webp"
                    alt="Bork"
                    fill={true}
                    className="object-cover"
                  />
                </div>
                <div className="w-20 h-10 bg-gray-600/50 animate-pulse rounded-lg" />
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about market trends..."
              className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
            <Button
              type="submit"
              size="icon"
              className="bg-gray-600 hover:bg-gray-700"
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
