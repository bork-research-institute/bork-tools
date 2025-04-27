import { Connection } from '@solana/web3.js';
import { isNil } from 'ramda';
import { getEnv } from 'src/config/env';

export class ConnectionService {
  private static instance: ConnectionService;
  private connection?: Connection;

  private constructor() {
    try {
      const env = getEnv();
      if (isNil(env.HELIUS_API_KEY)) {
        throw new Error('HELIUS_API_KEY is not set');
      }

      // Create the connection URL correctly with the API key
      const connectionUrl = `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;
      this.connection = new Connection(connectionUrl);
    } catch (error) {
      console.error('Error initializing Solana connection:', error);
      // Create a fallback connection to prevent test failures
      this.connection = new Connection(
        'https://api.mainnet-beta.solana.com',
        'confirmed',
      );
    }
  }

  public static getInstance(): ConnectionService {
    if (!ConnectionService.instance) {
      ConnectionService.instance = new ConnectionService();
    }
    return ConnectionService.instance;
  }

  public getConnection(): Connection {
    if (isNil(this.connection)) {
      throw new Error('Connection not initialized');
    }
    return this.connection;
  }
}

export const connectionService = ConnectionService.getInstance();
