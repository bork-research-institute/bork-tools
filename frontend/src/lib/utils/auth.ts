import {
  InvalidSignatureError,
  NotEnoughBorkTokensError,
  TokenBalanceError,
} from '@/lib/errors/auth-error';
import { signInSchema } from '@/lib/validators/signin-schema';
import { stakerSchema } from '@/lib/validators/staker-schema';
import bs58 from 'bs58';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import nacl from 'tweetnacl';

// Minimum required $BORK tokens for access
const MIN_BORK_REQUIRED = 100_000_000;

export const { signIn, signOut, auth, handlers } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        message: {
          label: 'Message',
          type: 'text',
          placeholder: 'Sign this message to verify your wallet ownership',
        },
        signature: {
          label: 'Signature',
          type: 'text',
          placeholder: 'ffds3243ddasdsas',
        },
        address: {
          label: 'Address',
          type: 'text',
          placeholder: 'AbCdefGzasdgesdad',
        },
      },
      async authorize(credentials) {
        try {
          const { signature, message, address } =
            signInSchema.parse(credentials);
          const signatureUint8 = bs58.decode(signature);
          const msgUint8 = new TextEncoder().encode(message);
          const pubKeyUint8 = bs58.decode(address);

          const result = nacl.sign.detached.verify(
            msgUint8,
            signatureUint8,
            pubKeyUint8,
          );

          if (!result) {
            console.error('Invalid signature', address);
            throw new InvalidSignatureError('invalid_signature');
          }

          // Check if user has enough $BORK tokens
          const response = await fetch(
            `https://bork-tools.vercel.app/api/stakers/${address}`,
          );

          if (!response.ok) {
            console.error('Failed to fetch staker data:', response.statusText);
            throw new TokenBalanceError('insufficient_tokens_fetch_error');
          }

          const data = await response.json();
          const stakerData = stakerSchema.parse(data);

          if (stakerData.total < MIN_BORK_REQUIRED) {
            console.error('User does not have enough $BORK tokens');
            throw new NotEnoughBorkTokensError('insufficient_tokens');
          }

          return {
            id: address,
            tokens: stakerData.total,
          };
        } catch (error) {
          console.error(error);
          throw error;
        }
      },
    }),
  ],
});
