import { type IAgentRuntime, elizaLogger } from '@elizaos/core';
import { DeriveKeyProvider, TEEMode } from '@elizaos/plugin-tee';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { getEnv } from '../../../config/env';

export interface KeypairResult {
  keypair?: Keypair;
  publicKey?: PublicKey;
}

/**
 * Gets either a keypair or public key based on TEE mode and runtime settings
 * @param runtime The agent runtime
 * @param requirePrivateKey Whether to return a full keypair (true) or just public key (false)
 * @returns KeypairResult containing either keypair or public key
 */
export async function getWalletKey(
  runtime: IAgentRuntime,
  requirePrivateKey = true,
): Promise<KeypairResult> {
  const env = getEnv();
  const teeMode = env.TEE_MODE;

  if (teeMode !== TEEMode.OFF) {
    const walletSecretSalt = env.WALLET_SECRET_SALT;
    if (!walletSecretSalt) {
      throw new Error('WALLET_SECRET_SALT required when TEE_MODE is enabled');
    }

    const deriveKeyProvider = new DeriveKeyProvider(teeMode);
    const deriveKeyResult = await deriveKeyProvider.deriveEd25519Keypair(
      walletSecretSalt,
      'solana',
      runtime.agentId,
    );

    // Convert TEE Keypair to Solana Keypair
    const solanaKeypair = Keypair.fromSecretKey(
      new Uint8Array(deriveKeyResult.keypair.secretKey),
    );

    return requirePrivateKey
      ? { keypair: solanaKeypair }
      : { publicKey: solanaKeypair.publicKey };
  }

  // TEE mode is OFF
  if (requirePrivateKey) {
    const privateKeyString = env.SOLANA_PRIVATE_KEY;

    if (!privateKeyString) {
      throw new Error('Private key not found in environment variables');
    }

    try {
      // First try base58
      const secretKey = bs58.decode(privateKeyString);
      return { keypair: Keypair.fromSecretKey(secretKey) };
    } catch (e) {
      elizaLogger.log('Error decoding base58 private key:', e);
      try {
        // Then try base64
        elizaLogger.log('Try decoding base64 instead');
        const secretKey = Uint8Array.from(
          Buffer.from(privateKeyString, 'base64'),
        );
        return { keypair: Keypair.fromSecretKey(secretKey) };
      } catch (e2) {
        elizaLogger.error('Error decoding private key: ', e2);
        throw new Error('Invalid private key format');
      }
    }
  } else {
    const publicKeyString = env.SOLANA_PUBLIC_KEY;

    if (!publicKeyString) {
      throw new Error('Public key not found in environment variables');
    }

    return { publicKey: new PublicKey(publicKeyString) };
  }
}
