import { getClientEnv } from '@/lib/config/client-env';

const JUPITER_QUOTE_API = 'https://lite-api.jup.ag/swap/v1/quote';
const JUPITER_SWAP_API = 'https://lite-api.jup.ag/swap/v1/swap';

export interface JupiterQuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: number;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

export interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
  computeUnitLimit: number;
  prioritizationType: {
    computeBudget: {
      microLamports: number;
      estimatedMicroLamports: number;
    };
  };
  dynamicSlippageReport: {
    slippageBps: number;
    otherAmount: number;
    simulatedIncurredSlippageBps: number;
    amplificationRatio: string;
    categoryName: string;
    heuristicMaxSlippageBps: number;
  };
  simulationError: string | null;
}

export class JupiterService {
  private static instance: JupiterService;
  private feeAccount: string;

  private constructor() {
    const clientEnv = getClientEnv();
    this.feeAccount =
      clientEnv.NEXT_PUBLIC_COLLECTION_WALLET_SOLANA_TOKEN_ACCOUNT;
  }

  public static getInstance(): JupiterService {
    if (!JupiterService.instance) {
      JupiterService.instance = new JupiterService();
    }
    return JupiterService.instance;
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: string,
    slippageBps = 50,
  ): Promise<JupiterQuoteResponse> {
    const url = new URL(JUPITER_QUOTE_API);
    url.searchParams.append('inputMint', inputMint);
    url.searchParams.append('outputMint', outputMint);
    url.searchParams.append('amount', amount);
    url.searchParams.append('slippageBps', slippageBps.toString());
    url.searchParams.append('restrictIntermediateTokens', 'true');
    url.searchParams.append('platformFeeBps', '50'); // 0.5% fee
    url.searchParams.append('feeAccount', this.feeAccount);

    console.log('Fetching quote with params:', {
      inputMint,
      outputMint,
      amount,
      slippageBps,
      restrictIntermediateTokens: true,
      feeAccount: this.feeAccount,
      platformFeeBps: 50,
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get quote: ${response.statusText} - ${errorText}`,
      );
    }

    const quoteResponse = await response.json();
    console.log('Quote response:', quoteResponse);
    return quoteResponse;
  }

  async getSwapTransaction(
    quoteResponse: JupiterQuoteResponse,
    userPublicKey: string,
  ): Promise<JupiterSwapResponse> {
    const response = await fetch(JUPITER_SWAP_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        feeAccount: this.feeAccount,
        asLegacyTransaction: false,
        computeUnitLimit: 200000,
        prioritizationFeeLamports: 10000,
        dynamicComputeUnitLimit: true,
        dynamicSlippage: true,
        skipUserAccountsCheck: true,
        useSharedAccounts: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to get swap transaction: ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  }
}

export const jupiterService = JupiterService.getInstance();
