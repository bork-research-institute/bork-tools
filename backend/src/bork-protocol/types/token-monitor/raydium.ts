export interface RoutePlan {
  poolId: string;
  inputMint: string;
  outputMint: string;
  feeMint: string;
  feeRate: number;
  feeAmount: string;
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  remainingAccounts: any[];
}

export interface SwapData {
  swapType: string;
  inputMint: string;
  inputAmount: string;
  outputMint: string;
  outputAmount: string;
  otherAmountThreshold: string;
  slippageBps: number;
  priceImpactPct: number;
  referrerAmount: string;
  routePlan: RoutePlan[];
}

export interface SwapResponse {
  id: string;
  success: boolean;
  version: string;
  data: SwapData;
}

export interface SwapInfo {
  inputMint: string;
  outputMint: string;
  inAmount: number;
  outAmount: number;
  feeRate: number;
  priceImpact: number;
  poolId: string;
}
