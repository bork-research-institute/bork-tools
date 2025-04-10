import { CredentialsSignin } from 'next-auth';

export class NotEnoughBorkTokensError extends CredentialsSignin {
  constructor(message: string) {
    super(message);
    this.code = message;
  }
}

export class TokenBalanceError extends CredentialsSignin {
  constructor(message: string) {
    super(message);
    this.code = message;
  }
}

export class InvalidSignatureError extends CredentialsSignin {
  constructor(message: string) {
    super(message);
    this.code = message;
  }
}
