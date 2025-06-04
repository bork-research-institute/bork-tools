import { MIN_BORK_REQUIRED, checkTokenBalance } from '@bork-tools/shared';
import { elizaLogger } from '@elizaos/core';
import type { Context } from 'elysia';

interface TokenValidationContext extends Context {
  body: {
    userPublicKey: string;
    [key: string]: unknown;
  };
}

/**
 * Middleware to validate that a user has sufficient BORK tokens
 * @param context - Elysia context containing the request body
 * @returns Response with 403 status if insufficient tokens, otherwise continues
 */
export async function tokenValidationMiddleware(
  context: TokenValidationContext,
) {
  const { userPublicKey } = context.body;

  try {
    elizaLogger.info(
      `[TokenValidation] Checking token balance for wallet: ${userPublicKey}`,
    );

    const hasRequiredBalance = await checkTokenBalance(userPublicKey);

    if (!hasRequiredBalance) {
      elizaLogger.warn(
        `[TokenValidation] Insufficient token balance for wallet: ${userPublicKey}`,
      );

      context.set.status = 403;
      return {
        error: 'Insufficient token balance',
        message: `You need at least ${MIN_BORK_REQUIRED.toLocaleString()} BORK tokens to use this feature`,
        code: 'INSUFFICIENT_BALANCE',
      };
    }

    elizaLogger.info(
      `[TokenValidation] Token balance validation passed for wallet: ${userPublicKey}`,
    );

    // Validation passed, continue to next handler
  } catch (error) {
    elizaLogger.error(
      `[TokenValidation] Error validating token balance for wallet: ${userPublicKey}`,
      error,
    );

    context.set.status = 500;
    return {
      error: 'Token validation failed',
      message: 'Unable to verify token balance. Please try again later.',
      code: 'VALIDATION_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
