export interface TokenBalanceResult {
  hasRequiredBalance: boolean;
  actualBalance: number;
  requiredBalance: number;
}

export interface TokenValidationError {
  code: 'INSUFFICIENT_BALANCE' | 'API_ERROR' | 'INVALID_WALLET';
  message: string;
  details?: unknown;
}
