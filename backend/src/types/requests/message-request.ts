import { Address } from "viem";

export interface MessageRequest {
    roomId?: string;
    userId: string;
    userName?: string;
    name?: string;
    text?: string;
    walletAddress?: Address;
  }