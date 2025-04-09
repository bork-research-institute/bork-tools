import {
  type SignInSchema,
  signInSchema,
} from '@/lib/validators/signin-schema';
import bs58 from 'bs58';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import nacl from 'tweetnacl';

async function verifySolanaSignature({
  address,
  message,
  signature,
}: SignInSchema) {
  try {
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

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

          // TODO Add the validation to check if user has enough bork
          if (result) {
            return {
              id: address,
            };
          }
          return null;
        } catch (error) {
          console.error(error);
          return null;
        }
      },
    }),
  ],
});

// TODO: Add more validations for the login flow
