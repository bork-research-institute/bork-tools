'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useBackendStatus } from '@/hooks/use-backend-status';
import { useUserTokenBalance } from '@/hooks/use-user-token-balance';
import { useWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';

interface ChatButtonProps {
  onOpenChat: () => void;
}

export function ChatButton({ onOpenChat }: ChatButtonProps) {
  const { publicKey } = useWallet();
  const {
    data: backendStatus,
    isError: isBackendError,
    isLoading: isBackendLoading,
  } = useBackendStatus();
  const {
    data: hasEnoughTokens,
    isLoading: isTokenBalanceLoading,
    isError: isTokenBalanceError,
  } = useUserTokenBalance();

  // Check if backend is available
  const isBackendAvailable =
    !isBackendError && !isBackendLoading && backendStatus?.status === 'ok';

  // Determine if chat should be disabled and why
  const getChatStatus = () => {
    if (!publicKey) {
      return {
        disabled: true,
        message: 'Connect your wallet to chat with Bork.',
      };
    }

    if (isBackendLoading) {
      return {
        disabled: true,
        message: 'Checking agent status...',
      };
    }

    if (isBackendError || !isBackendAvailable) {
      return {
        disabled: true,
        message: 'Agent is currently offline. Please try again later.',
      };
    }

    if (isTokenBalanceLoading) {
      return {
        disabled: true,
        message: 'Checking token balance...',
      };
    }

    if (isTokenBalanceError || !hasEnoughTokens) {
      return {
        disabled: true,
        message: 'You need at least 100M $BORK tokens to chat.',
      };
    }

    return {
      disabled: false,
      message: 'Chat with Bork',
    };
  };

  const chatStatus = getChatStatus();

  const handleClick = () => {
    if (!chatStatus.disabled) {
      onOpenChat();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild={true}>
            <div>
              <Button
                aria-label={chatStatus.message}
                className={`rounded-full h-16 w-16 p-0 mr-4 mb-4 shadow-lg overflow-visible ${
                  chatStatus.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
                onClick={handleClick}
              >
                <div
                  className={`absolute inset-[-8px] rounded-full bg-gray-500/50 blur-md ${
                    chatStatus.disabled ? '' : 'animate-pulse'
                  }`}
                />
                <div className="absolute inset-0 rounded-full overflow-hidden">
                  <Image
                    src="/assets/Borksticker.webp"
                    alt="Bork"
                    fill={true}
                    className={`object-cover ${
                      chatStatus.disabled ? 'grayscale' : ''
                    }`}
                  />
                </div>
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            className="bg-black text-white border border-white/10 z-[9999]"
          >
            {chatStatus.message}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
