import { AnchorProvider } from '@coral-xyz/anchor';
import Wallet from '@coral-xyz/anchor/dist/esm/nodewallet.js';
import {
  buildStakingNetworkActions,
  builtPoolUtils,
  getGFMProgram,
  getWhirlpoolClient,
  initRaydiumSdk,
} from '@gofundmeme/sdk';
import { Connection, Keypair } from '@solana/web3.js';
import { getServerEnv } from './server-env';

const { RPC_URL } = getServerEnv();

if (!RPC_URL) {
  throw new Error('Missing RPC_URL environment variables');
}

export async function getGfmClient() {
  const connection = new Connection(RPC_URL);
  const keypair = Keypair.generate();
  const provider = new AnchorProvider(connection, new Wallet(keypair), {
    commitment: 'confirmed',
  });
  const gfmProgram = getGFMProgram(provider);
  const orcaContext = getWhirlpoolClient(provider);
  const raydium = await initRaydiumSdk({
    loadToken: true,
    connection,
    owner: keypair,
  });

  const getStakingNetwork = async () => {
    return await buildStakingNetworkActions({
      gfmProgram,
    });
  };

  return {
    gfmProgram,
    pools: builtPoolUtils({ gfmProgram, raydium, orcaContext }),
    getStakingNetwork: getStakingNetwork,
  };
}
