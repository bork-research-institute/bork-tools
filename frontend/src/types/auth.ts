export type AuthError =
  | 'insufficient_tokens'
  | 'insufficient_tokens_fetch_error'
  | 'token_validation_error'
  | 'invalid_signature'
  | null;

export type ErrorMessageMap = {
  [key in Exclude<AuthError, null>]: string;
};

export const ERROR_MESSAGES: ErrorMessageMap = {
  insufficient_tokens:
    'You need at least 100M $BORK tokens to access Eggsight.',
  insufficient_tokens_fetch_error:
    'Failed to verify your $BORK token balance. Please try again later.',
  token_validation_error:
    'Failed to verify your $BORK token balance. Please try again later.',
  invalid_signature: 'Invalid wallet signature. Please try again.',
};
