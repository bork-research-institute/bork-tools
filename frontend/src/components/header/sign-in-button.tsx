'use client';
import { Button } from '@/components/ui/button';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { Wallet } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export function SignInButton() {
  const { signMessage, publicKey } = useWallet();
  const [isSigning, setIsSigning] = useState(false);
  const router = useRouter();

  const handleAuth = async () => {
    if (!signMessage) {
      console.error('Not connected or no address');
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
          if (response?.code === 'credentials') {
            toast.error('Cannot access page');
          } else {
            toast.success('Authentication successful');
            router.push('/');
          }
        } catch (error) {
          console.error('Error signing in', error);
          throw error;
        } finally {
          setIsSigning(false);
        }
      },
      {
        loading: 'Logging in...',
        error: 'Authentication error',
      },
    );
  };

  return (
    <Button
      className="flex w-48 items-center justify-center space-x-2 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-white transition-all duration-200 hover:bg-emerald-400/20"
      type="button"
      onClick={handleAuth}
      disabled={isSigning}
    >
      <Wallet className="h-5 w-5" />
      <span>{'Sign In'}</span>
    </Button>
  );
}
