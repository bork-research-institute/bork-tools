'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  type JupiterQuoteResponse,
  jupiterService,
} from '@/lib/services/jupiter-service';
import { getBalances } from '@/lib/services/solana-balance-service';
import { cn } from '@/lib/utils';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import {
  type ConfirmedSignatureInfo,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
} from '@solana/web3.js';
import { Coins } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Spinner } from '../ui/spinner';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenAddress: string;
  tokenSymbol: string;
}

export function SwapModal({
  isOpen,
  onClose,
  tokenAddress,
  tokenSymbol,
}: SwapModalProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<JupiterQuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isBuying, setIsBuying] = useState(true);
  const [solBalance, setSolBalance] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  // Fetch balances when modal opens or wallet changes
  useEffect(() => {
    async function fetchBalances() {
      if (!publicKey || !isOpen) {
        return;
      }

      try {
        const { solBalance, tokenBalance } = await getBalances(
          publicKey.toString(),
          isBuying ? undefined : tokenAddress,
        );

        setSolBalance(solBalance / LAMPORTS_PER_SOL);
        if (!isBuying && tokenBalance !== null) {
          setTokenBalance(tokenBalance);
        }
      } catch (error) {
        console.error('Error fetching balances:', error);
        toast.error('Failed to fetch balances');
      }
    }

    fetchBalances();
  }, [publicKey, isOpen, isBuying, tokenAddress]);

  // Fetch quote when amount changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!isOpen || !publicKey) {
        return;
      }

      const amountNum = Number.parseFloat(amount);
      if (!amountNum || amountNum <= 0) {
        setQuote(null);
        return;
      }

      try {
        const inputMint = isBuying
          ? 'So11111111111111111111111111111111111111112' // SOL
          : tokenAddress;
        const outputMint = isBuying
          ? tokenAddress
          : 'So11111111111111111111111111111111111111112'; // SOL

        // Convert amount to proper decimals
        const amountInLamports = isBuying
          ? Math.floor(amountNum * LAMPORTS_PER_SOL).toString() // SOL has 9 decimals
          : Math.floor(amountNum * 1e6).toString(); // Most SPL tokens have 6 decimals

        console.log('Fetching quote with params:', {
          inputMint,
          outputMint,
          amountInLamports,
          isBuying,
        });

        const quoteResponse = await jupiterService.getQuote(
          inputMint,
          outputMint,
          amountInLamports,
        );

        console.log('Quote response:', quoteResponse);
        setQuote(quoteResponse);
      } catch (error) {
        console.error('Error fetching quote:', error);
        toast.error('Failed to fetch quote');
        setQuote(null);
      }
    };

    fetchQuote();
  }, [isOpen, amount, publicKey, isBuying, tokenAddress]);

  const handleSwap = async () => {
    if (!publicKey || !quote) {
      return;
    }

    try {
      setLoading(true);
      const swapResponse = await jupiterService.getSwapTransaction(
        quote,
        publicKey.toString(),
      );

      // Deserialize the transaction
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(swapResponse.swapTransaction, 'base64'),
      );

      // Sign and send the transaction
      const signature = await sendTransaction(transaction, connection, {
        maxRetries: 2,
        skipPreflight: true,
      });

      // Wait for confirmation with a timeout
      const confirmation = (await Promise.race([
        connection.confirmTransaction(
          {
            signature,
            blockhash: transaction.message.recentBlockhash,
            lastValidBlockHeight: swapResponse.lastValidBlockHeight,
          },
          'confirmed',
        ),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Transaction confirmation timeout')),
            30000,
          ),
        ),
      ])) as { value: ConfirmedSignatureInfo };

      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        );
      }

      // Verify the transaction was successful
      const status = await connection.getSignatureStatus(signature);
      if (status.value?.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(status.value.err)}`,
        );
      }

      toast.success(
        `Swap completed successfully! View on Solscan: https://solscan.io/tx/${signature}`,
        {
          duration: 5000,
        },
      );

      // Reset the form
      setAmount('');
      setQuote(null);
      onClose();
    } catch (error) {
      console.error('Error executing swap:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to execute swap';

      toast.error(errorMessage, {
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-black/90 border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isBuying ? 'Buy' : 'Sell'} {tokenSymbol}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'text-xs',
                isBuying
                  ? 'text-emerald-400'
                  : 'text-white/60 hover:text-white',
              )}
              onClick={() => setIsBuying(true)}
            >
              Buy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'text-xs',
                isBuying
                  ? 'text-white/60 hover:text-white'
                  : 'text-emerald-400',
              )}
              onClick={() => setIsBuying(false)}
            >
              Sell
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">
                You {isBuying ? 'pay' : 'sell'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-white">
                  {isBuying ? 'SOL' : tokenSymbol}
                </span>
                <span className="text-white/40 text-xs">
                  Balance:{' '}
                  {isBuying ? solBalance.toFixed(4) : tokenBalance.toFixed(4)}{' '}
                  {isBuying ? 'SOL' : tokenSymbol}
                </span>
              </div>
            </div>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter amount in ${isBuying ? 'SOL' : tokenSymbol}`}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          {quote && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">
                  You {isBuying ? 'receive' : 'get'}
                </span>
                <span className="text-white">
                  {isBuying ? tokenSymbol : 'SOL'}
                </span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-md p-3 text-white">
                {isBuying
                  ? (Number(quote.outAmount) / 1e6).toFixed(4) // Convert from token decimals (6)
                  : (Number(quote.outAmount) / LAMPORTS_PER_SOL).toFixed(
                      4,
                    )}{' '}
                {isBuying ? tokenSymbol : 'SOL'}
              </div>
              <div className="text-xs text-white/60">
                Price Impact: {Number(quote.priceImpactPct).toFixed(2)}%
              </div>
            </div>
          )}

          <Button
            className="w-full bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20"
            onClick={handleSwap}
            disabled={!amount || !quote || loading}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Coins className="h-4 w-4 mr-2" />
                {isBuying ? 'Buy' : 'Sell'} {tokenSymbol}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
