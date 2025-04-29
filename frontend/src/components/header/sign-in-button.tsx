'use client';
import { Button } from '@/components/ui/button';
import { type AuthError, ERROR_MESSAGES } from '@/types/auth';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { Wallet } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
  disabled?: boolean;
  onError?: (error: AuthError) => void;
}

export function SignInButton({ onError, disabled }: Props) {
  const { signMessage, publicKey } = useWallet();
  const [isSigning, setIsSigning] = useState(false);
  const router = useRouter();

  const handleAuth = async () => {
    if (!signMessage || !publicKey) {
      console.error('Not connected or no address');
      toast.error('Wallet not connected');
      return;
    }

    toast.promise(
      async () => {
        try {
          setIsSigning(true);
          // Sign the message
          const message = `Sign this message to verify your wallet ownership\nAddress: ${publicKey}`;
          const encodedMessage = new TextEncoder().encode(message);
          const signature = await signMessage(encodedMessage);
          const serializedSignature = bs58.encode(signature);

          // Call NextAuth signin
          const response = await signIn('credentials', {
            message,
            signature: serializedSignature,
            address: publicKey,
            redirect: false,
          });

          if (response?.error) {
            // Handle specific errors
            if (response.code === 'insufficient_tokens') {
              onError?.(response.code);
              toast.error(ERROR_MESSAGES.insufficient_tokens);
            }

            if (
              response.code === 'insufficient_tokens_fetch_error' ||
              response.code === 'token_validation_error'
            ) {
              onError?.(response.code);
              toast.error(ERROR_MESSAGES[response.code]);
            }
          } else {
            toast.success('Authentication successful');
            router.push('/');
          }
        } catch (error) {
          console.error('Error signing in', error);
        } finally {
          setIsSigning(false);
        }
      },
      {
        loading: 'Logging in...',
        error: 'Authentication failed',
      },
    );
  };

  return (
    <Button
      className="flex w-48 items-center justify-center space-x-1.5 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-2 py-1.5 text-xs text-white transition-all duration-200 hover:bg-emerald-400/20"
      type="button"
      onClick={handleAuth}
      disabled={isSigning || disabled}
    >
      <Wallet className="h-3.5 w-3.5" />
      <span>Sign In</span>
    </Button>
  );
}
