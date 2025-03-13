import { Connection } from '@solana/web3.js';
import { getTokenAccountsWithGFMInteractions } from '../frontend/src/features/bork-leaderboard/get-program-interactions';
import { getServerEnv } from '../frontend/src/lib/config/server-env';
import { supabaseAdmin } from '../frontend/src/lib/config/server-supabase';

// Use mainnet-beta by default
const connection = new Connection(getServerEnv().RPC_URL, 'confirmed');

// The mint address for the token you want to track
const MINT_ADDRESS = 'yzRagkRLnzG3ksiCRpknHNVc1nep6MMS7rKJv8YHGFM'; // GFM token mint

interface LastWalletTransfer {
  token_account: string;
  signature: string;
  created_at: string;
}

async function getLastTransfersByWallet(): Promise<
  Map<string, LastWalletTransfer>
> {
  const { data, error } = await supabaseAdmin
    .from('gfm_transfers')
    .select('token_account, signature, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching last transfers:', error);
    throw error;
  }

  // Create a map of wallet address to their last transfer
  const lastTransfers = new Map<string, LastWalletTransfer>();
  if (data) {
    for (const transfer of data) {
      if (!lastTransfers.has(transfer.token_account)) {
        lastTransfers.set(transfer.token_account, transfer);
      }
    }
  }

  return lastTransfers;
}

async function syncGfmTransfers() {
  try {
    console.log('Starting GFM transfers sync...');

    // Get the last transfer for each wallet
    const lastTransfers = await getLastTransfersByWallet();
    console.log(`Found last transfers for ${lastTransfers.size} wallets`);

    // This will now save transfers as it finds them, using the last signature for each wallet
    console.log('Fetching new interactions...');
    const interactions = await getTokenAccountsWithGFMInteractions(
      connection,
      MINT_ADDRESS,
      lastTransfers,
    );

    console.log(`Found ${interactions.length} new interactions to process`);
    console.log('GFM transfers sync completed successfully');
  } catch (error) {
    console.error('Error syncing GFM transfers:', error);
    throw error;
  }
}

// Run the script
syncGfmTransfers()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
