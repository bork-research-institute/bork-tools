import { Connection } from '@solana/web3.js';
import { isNil } from 'ramda';

export class ConnectionService {
  private static instance: ConnectionService;
  private connection?: Connection;

  private constructor() {
    if (isNil(process.env.QUICKNODE_URL)) {
      throw new Error('QUICKNODE_URL is not set');
    }
    this.connection = new Connection(process.env.QUICKNODE_URL);
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
