'use client';

import { Send } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  useEffect(() => {
    if (isOpen && !hasShownWelcome) {
      const welcomeMessage: Message = {
        id: 'welcome',
        content:
          "Hey anon! I'm your trench medic - here to help you navigate the markets. What's on your mind?",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
      setHasShownWelcome(true);
    }
  }, [isOpen, hasShownWelcome]);

  const handleSendMessage = () => {
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

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: Math.random().toString(),
        content:
          "I'm analyzing the market data and will get back to you shortly...",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <>
      <Button
        className="fixed bottom-4 right-4 rounded-full h-12 w-12 p-0 shadow-lg overflow-visible z-50"
        style={{ position: 'fixed', right: '1rem', bottom: '1rem' }}
        onClick={() => setIsOpen(true)}
      >
        <div className="absolute inset-[-8px] rounded-full bg-purple-500/50 blur-md animate-pulse" />
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <Image
            src="/assets/tm.jpeg"
            alt="Chat with Trench Medic"
            fill={true}
            className="object-cover"
          />
        </div>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px] h-[600px] flex flex-col gap-4 p-0 bg-black/90 border-white/10">
          <DialogTitle className="sr-only">Chat with Trench Medic</DialogTitle>
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <div className="relative h-10 w-10 rounded-full overflow-hidden">
              <Image
                src="/assets/tm.jpeg"
                alt="Trench Medic"
                fill={true}
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Trench Medic</h2>
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
                        src="/assets/tm.jpeg"
                        alt="Trench Medic"
                        fill={true}
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.isUser
                        ? 'bg-purple-600 text-white'
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
                className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Button
                type="submit"
                size="icon"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={!input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
