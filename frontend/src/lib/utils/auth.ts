import { InvalidSignatureError } from '@/lib/errors/auth-error';
import { signInSchema } from '@/lib/validators/signin-schema';
import bs58 from 'bs58';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import nacl from 'tweetnacl';

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

          return {
            id: address,
          };
        } catch (error) {
          console.error(error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      session.user = {
        ...session.user,
        id: user?.id || token?.sub || '',
      };
      return session;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
  },
});
