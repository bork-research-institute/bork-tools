import {
  type Connection,
  PublicKey,
  type VersionedTransactionResponse,
} from '@solana/web3.js';
import {
  type GfmTransfer,
  supabaseAdmin,
} from '../../lib/config/server-supabase';
import { getTokenAccountsByMint } from '../../lib/services/solana/get-program-accounts';

const GFM_PROGRAM_ID = new PublicKey(
  'GFMioXjhuDWMEBtuaoaDPJFPEnL2yDHCWKoVPhj1MeA7',
);

export interface TokenAccountInteraction {
  tokenAccount: string;
  owner: string;
  balance: string;
  senderWallet: string; // The wallet that sent tokens to this account
  senderOwner: string; // The owner of the sender's token account
  lastInteractionDate: Date;
  signature: string;
  amount: number; // The amount that was transferred
}

async function saveTransfer(
  interaction: TokenAccountInteraction,
): Promise<void> {
  const transfer: GfmTransfer = {
    signature: interaction.signature,
    token_account: interaction.tokenAccount,
    owner: interaction.owner,
    balance: interaction.balance,
    sender_wallet: interaction.senderWallet,
    sender_owner: interaction.senderOwner,
    interaction_date: interaction.lastInteractionDate,
    amount: interaction.amount,
  };

  const { error } = await supabaseAdmin
    .from('gfm_transfers')
    .upsert([transfer], {
      onConflict: 'signature',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error(`Error saving transfer ${transfer.signature}:`, error);
    throw error;
  }

  console.log(`Saved transfer ${transfer.signature} to database`);
}

async function findTokenTransferDetails(
  _connection: Connection,
  tx: VersionedTransactionResponse,
  targetTokenAccount: string,
  mintAddress: string,
): Promise<{
  senderWallet?: string;
  senderOwner?: string;
  timestamp?: Date;
  amount?: number;
}> {
  if (!tx.meta) {
    return {};
  }

  const preTokenBalances = tx.meta.preTokenBalances || [];
  const postTokenBalances = tx.meta.postTokenBalances || [];

  // Find the target token account in post balances (receiving)
  const targetPost = postTokenBalances.find(
    (p) =>
      p.accountIndex < tx.transaction.message.staticAccountKeys.length &&
      tx.transaction.message.staticAccountKeys[p.accountIndex].toString() ===
        targetTokenAccount &&
      p.mint === mintAddress, // Ensure it's the correct mint
  );

  if (!targetPost) {
    return {};
  }

  // Find the corresponding pre-balance
  const targetPre = preTokenBalances.find(
    (p) => p.accountIndex === targetPost.accountIndex,
  );
  const preAmount = targetPre?.uiTokenAmount?.uiAmount || 0;
  const postAmount = targetPost.uiTokenAmount?.uiAmount || 0;

  // Check if this account received tokens
  if (postAmount > preAmount) {
    // Look for the sender (account with decreased balance)
    for (const pre of preTokenBalances) {
      // Ensure we're looking at the same mint
      if (pre.mint !== mintAddress) {
        continue;
      }

      const post = postTokenBalances.find(
        (p) => p.accountIndex === pre.accountIndex,
      );
      const senderPreAmount = pre.uiTokenAmount?.uiAmount || 0;
      const senderPostAmount = post?.uiTokenAmount?.uiAmount || 0;

      if (senderPreAmount > senderPostAmount) {
        const accountKeys = tx.transaction.message.staticAccountKeys;
        const senderWallet =
          pre.accountIndex < accountKeys.length
            ? accountKeys[pre.accountIndex].toString()
            : undefined;
        const senderOwner = pre.owner; // The owner is already in the pre token balance
        const timestamp = tx.blockTime
          ? new Date(tx.blockTime * 1000)
          : undefined;
        const amount = senderPreAmount - senderPostAmount;

        return { senderWallet, senderOwner, timestamp, amount };
      }
    }
  }

  return {};
}

interface LastWalletTransfer {
  token_account: string;
  signature: string;
  created_at: string;
}

export async function getTokenAccountsWithGFMInteractions(
  connection: Connection,
  mintAddress: string,
  lastTransfers?: Map<string, LastWalletTransfer>,
): Promise<TokenAccountInteraction[]> {
  // 1. Get all token accounts for the mint
  const tokenAccounts = await getTokenAccountsByMint(mintAddress);
  console.log(
    `Found ${tokenAccounts.length} token accounts for mint ${mintAddress}`,
  );

  const interactions: TokenAccountInteraction[] = [];

  // 2. For each token account, get its transaction history
  for (const account of tokenAccounts) {
    // Skip accounts with zero balance
    if (account.amount === '0') {
      continue;
    }

    try {
      // Get the last transfer for this account if it exists
      const lastTransfer = lastTransfers?.get(account.address);

      // Get signatures for the token account, using the last signature if available
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey(account.address),
        {
          limit: 25, // Adjust limit as needed
          until: lastTransfer?.signature,
        },
      );

      if (signatures.length === 0) {
        console.log(
          `No new signatures found for account ${account.address} after signature ${lastTransfer?.signature}`,
        );
        continue;
      }

      console.log(
        `Found ${signatures.length} signatures to process for account ${account.address}`,
      );

      for (const sig of signatures) {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx) {
            continue;
          }

          // Check if transaction involves GFM program
          const accountKeys = tx.transaction.message.staticAccountKeys;

          if (accountKeys.some((key) => key.equals(GFM_PROGRAM_ID))) {
            // Find transfer details where this account is receiving
            const { senderWallet, senderOwner, timestamp, amount } =
              await findTokenTransferDetails(
                connection,
                tx,
                account.address,
                mintAddress,
              );

            if (senderWallet && senderOwner && timestamp && amount) {
              console.log(`Found GFM transfer:
  Signature: ${sig.signature}
  To: ${account.address}
  From: ${senderWallet}
  From Owner: ${senderOwner}
  Amount: ${amount}
  Timestamp: ${timestamp.toISOString()}`);

              const interaction: TokenAccountInteraction = {
                tokenAccount: account.address,
                owner: account.owner,
                balance: account.amount,
                senderWallet,
                senderOwner,
                lastInteractionDate: timestamp,
                signature: sig.signature,
                amount,
              };

              // Save the transfer immediately
              try {
                await saveTransfer(interaction);
                interactions.push(interaction);
              } catch (_saveError) {
                console.error(
                  `Failed to save transfer ${sig.signature}, continuing with next transaction`,
                );
              }

              break; // Found what we needed
            }
          }
        } catch (error) {
          console.error(
            `Error processing transaction ${sig.signature}: ${error}`,
          );
        }
      }
    } catch (error) {
      console.error(
        `Error processing token account ${account.address}: ${error}`,
      );
    }
  }

  console.log(
    `Found ${interactions.length} accounts with GFM program interactions`,
  );
  return interactions;
}
