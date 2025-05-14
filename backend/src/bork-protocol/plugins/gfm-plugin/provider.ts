import {
  type IAgentRuntime,
  type Memory,
  type Provider,
  type State,
  elizaLogger,
} from '@elizaos/core';
import { Connection, type PublicKey } from '@solana/web3.js';
import { getWalletKey } from './keypairUtils';

// Provider configuration
const PROVIDER_CONFIG = {
  DEFAULT_RPC: 'https://api.mainnet-beta.solana.com',
};

export class WalletProvider {
  private connection: Connection;
  private walletPublicKey: PublicKey;

  constructor(connection: Connection, walletPublicKey: PublicKey) {
    this.connection = connection;
    this.walletPublicKey = walletPublicKey;
  }

  getPublicKey(): string {
    return this.walletPublicKey.toBase58();
  }
}

const walletProvider: Provider = {
  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<string | null> => {
    try {
      const { publicKey } = await getWalletKey(runtime, false);

      const connection = new Connection(
        runtime.getSetting('SOLANA_RPC_URL') || PROVIDER_CONFIG.DEFAULT_RPC,
      );

      const provider = new WalletProvider(connection, publicKey);
      return provider.getPublicKey();
    } catch (error) {
      elizaLogger.error('Error in wallet provider:', error);
      return null;
    }
  },
};

// Module exports
export { walletProvider };
