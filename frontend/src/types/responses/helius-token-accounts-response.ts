import type { TokenAccount } from '../token-account';
import type { HeliusPagedResponse } from './helius-paged-response';

export type TokenAccountsResponse = HeliusPagedResponse<
  TokenAccount,
  'token_accounts'
>;
