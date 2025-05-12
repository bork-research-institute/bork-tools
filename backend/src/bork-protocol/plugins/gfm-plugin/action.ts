import { ImageGenerationService } from '@/services/image/image-generation';
import { fetchTopicKnowledge } from '@/utils/knowledge/fetch-topic-knowledge';
import {
  type Action,
  type ActionExample,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type State,
  composeContext,
  elizaLogger,
  generateObject,
} from '@elizaos/core';
import { initGoFundMemeSDK } from '@gofundmeme/sdk';
import { Connection } from '@solana/web3.js';
import sharp from 'sharp';
import { z } from 'zod';
import { getWalletKey } from './keypairUtils';
import { payload } from './payload';
import { launchTemplate } from './template';
import type { LaunchContent } from './types';

interface KnowledgeMetrics {
  likes?: number;
  retweets?: number;
}

interface KnowledgeItem {
  content: string;
  topics: string[];
  metrics: KnowledgeMetrics;
}

const launchContentSchema = z.object({
  token: z.object({
    base64: z.string(),
    name: z.string(),
    symbol: z.string(),
    description: z.string(),
    website: z.string().nullable(),
    twitter: z.string().nullable(),
    discord: z.string().nullable(),
    telegram: z.string().nullable(),
  }),
});

export default {
  name: 'LAUNCH_TOKEN',
  similes: ['CREATE_TOKEN', 'MAKE_TOKEN', 'GENERATE_TOKEN', 'INITIALIZE_TOKEN'],
  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    elizaLogger.log('Validating token launch from user:', message.userId);
    return true;
  },
  description: 'Launch a gfm token using the fair launch protocol',
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    initialState: State,
    _options: { [key: string]: unknown },
    callback?: HandlerCallback,
  ): Promise<boolean> => {
    elizaLogger.log('Starting LAUNCH_TOKEN handler...');

    let state = initialState;
    if (state) {
      state = await runtime.updateRecentMessageState(state);
      elizaLogger.log('Updated state from initial state');
    } else {
      state = (await runtime.composeState(message)) as State;
      elizaLogger.log('Created new state from message');
    }

    // Extract the token theme/topic from the message
    const tokenTheme = message.content.text.toLowerCase();
    elizaLogger.log('Fetching knowledge for token theme:', tokenTheme);

    // Fetch relevant knowledge
    const knowledge = await fetchTopicKnowledge(runtime, tokenTheme);
    elizaLogger.log('Fetched knowledge items:', knowledge.length);

    const relevantKnowledge = knowledge
      .map((k) => ({
        content: k.content.text,
        topics: k.content.metadata?.topics || [],
        metrics: k.content.metadata?.metrics || {},
      }))
      .filter((k) => k.content && k.content.length > 0)
      .slice(0, 5) as KnowledgeItem[]; // Take top 5 most relevant pieces

    elizaLogger.log(
      'Filtered relevant knowledge items:',
      relevantKnowledge.length,
    );

    // Format knowledge context
    const knowledgeContext = relevantKnowledge
      .map(
        (k) =>
          `Content: ${k.content}\nTopics: ${k.topics.join(', ')}\nEngagement: ${k.metrics.likes || 0} likes, ${k.metrics.retweets || 0} retweets`,
      )
      .join('\n---\n');

    elizaLogger.log('Created knowledge context');

    // Create context with knowledge
    const launchContext = composeContext({
      state,
      template:
        launchTemplate +
        (knowledgeContext
          ? `\n\nRelevant Knowledge:\n${knowledgeContext}`
          : ''),
    });

    elizaLogger.log('Generating token content...');
    const { object: content } = (await generateObject({
      runtime,
      context: launchContext,
      modelClass: ModelClass.MEDIUM,
      schema: launchContentSchema,
    })) as { object: LaunchContent };

    elizaLogger.log('Generated token content:', {
      name: content.token.name,
      symbol: content.token.symbol,
      hasDescription: !!content.token.description,
      hasWebsite: !!content.token.website,
      hasTwitter: !!content.token.twitter,
      hasDiscord: !!content.token.discord,
      hasTelegram: !!content.token.telegram,
    });

    // Validate the content
    if (
      !content.token ||
      !content.token.name ||
      !content.token.symbol ||
      !content.token.description
    ) {
      elizaLogger.warn('Missing required token fields:', {
        hasName: !!content.token?.name,
        hasSymbol: !!content.token?.symbol,
        hasDescription: !!content.token?.description,
      });
      if (callback) {
        callback({
          text: 'Please provide a token name, symbol, and description.',
          content: {
            error: 'Missing required fields',
            missingFields: ['name', 'symbol', 'description'],
            fieldGuidance: {
              name: 'Please provide the full name of your token (e.g., "My Awesome Token")',
              symbol:
                'Please provide a 2-5 character ticker symbol for your token (e.g., "MAT")',
              description:
                "Please provide a clear description of your token's purpose and utility",
            },
          },
        });
      }
      return false;
    }

    try {
      // Generate the token logo image
      elizaLogger.log('Initializing image generation service...');
      const imageService = new ImageGenerationService();
      await imageService.initialize(runtime);

      elizaLogger.log('Generating image with prompt:', content.token.base64);

      const imageResult = await imageService.generateImage(
        content.token.base64,
        {
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'standard',
        },
      );

      if (!imageResult || !imageResult.base64Data) {
        throw new Error('Failed to generate image: No base64 data received');
      }

      elizaLogger.log('Image generated successfully');

      // Compress and resize the image
      try {
        const imageBuffer = Buffer.from(imageResult.base64Data, 'base64');
        elizaLogger.log('Original image size:', imageBuffer.length, 'bytes');

        elizaLogger.log('Starting image compression...');
        const compressedImageBuffer = await sharp(imageBuffer)
          .resize(128, 128, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png({
            quality: 60,
            compressionLevel: 9,
            palette: true,
            colors: 256,
          })
          .toBuffer();

        elizaLogger.log(
          'Compressed image size:',
          compressedImageBuffer.length,
          'bytes',
          'Compression ratio:',
          `${(imageBuffer.length / compressedImageBuffer.length).toFixed(2)}x`,
        );
        const compressedBase64 = compressedImageBuffer.toString('base64');
        elizaLogger.log('Image compressed and resized to 128x128');

        elizaLogger.log('Getting wallet key...');
        const walletResult = await getWalletKey(runtime, true);
        if (!walletResult.keypair) {
          throw new Error('Failed to get wallet keypair');
        }
        elizaLogger.log('Wallet key obtained successfully');

        elizaLogger.log('Initializing Solana connection...');
        const connection = new Connection(
          'https://api.mainnet-beta.solana.com',
        );
        elizaLogger.log('Initializing GFM SDK...');
        const gfmSDK = await initGoFundMemeSDK({ connection });

        // Update payload with the content from the template and the compressed image
        const launchPayload = {
          ...payload,
          token: {
            ...content.token,
            base64: compressedBase64,
          },
          creatorWalletAddress: walletResult.keypair.publicKey.toBase58(),
        };

        elizaLogger.log('Launching token with payload:', {
          tokenName: launchPayload.token.name,
          tokenSymbol: launchPayload.token.symbol,
          imageSize: compressedBase64.length,
          creatorAddress: launchPayload.creatorWalletAddress,
          network: launchPayload.network,
          supply: launchPayload.supply,
        });

        elizaLogger.log('Creating pool request...');
        const createRequest =
          await gfmSDK.api.bondingCurve.createPool.request(launchPayload);
        elizaLogger.log('Pool request created, signing transaction...');
        console.log('✍️ Sign the transaction:', createRequest.transaction);

        elizaLogger.log('Signing and confirming transaction...');
        try {
          const response = await createRequest.signAndConfirm({
            creator: walletResult.keypair,
          });
          elizaLogger.log('Transaction confirmed successfully:', {
            mintAddress: response.mintAddress,
            txid: response.txid,
          });

          if (callback) {
            callback({
              text: `Successfully launched token ${content.token.name} (${content.token.symbol})!\nMint Address: ${response.mintAddress}\nTransaction ID: ${response.txid}\nView your token: https://gofundmeme.io/campaigns/${response.mintAddress}`,
              content: {
                success: true,
                response,
                mintAddress: response.mintAddress,
                txid: response.txid,
                campaignUrl: `https://gofundmeme.io/campaigns/${response.mintAddress}`,
              },
            });
          }
        } catch (error) {
          // Handle transaction timeout but still try to get the mint address
          if (
            error instanceof Error &&
            error.message.includes('Transaction was not confirmed')
          ) {
            const signature = error.message.match(
              /signature ([A-Za-z0-9]+)/,
            )?.[1];
            if (signature) {
              elizaLogger.log(
                'Transaction timed out but signature found:',
                signature,
              );

              // Wait a bit and try to get the transaction details
              await new Promise((resolve) => setTimeout(resolve, 5000));

              try {
                const tx = await connection.getTransaction(signature, {
                  commitment: 'confirmed',
                });
                if (tx) {
                  // Extract mint address from transaction logs
                  const mintAddress = tx.meta?.postTokenBalances?.[0]?.mint;
                  if (mintAddress) {
                    elizaLogger.log(
                      'Found mint address from transaction:',
                      mintAddress,
                    );
                    if (callback) {
                      callback({
                        text: `Token launch transaction submitted!\nMint Address: ${mintAddress}\nTransaction ID: ${signature}\nView your token: https://gofundmeme.io/campaigns/${mintAddress}`,
                        content: {
                          success: true,
                          mintAddress,
                          txid: signature,
                          campaignUrl: `https://gofundmeme.io/campaigns/${mintAddress}`,
                        },
                      });
                    }
                    return true;
                  }
                }
              } catch (txError) {
                elizaLogger.error(
                  'Error getting transaction details:',
                  txError,
                );
              }
            }
          }
          throw error; // Re-throw if we couldn't handle it
        }

        return true;
      } catch (error) {
        elizaLogger.error(
          'Error during image processing or token launch:',
          error,
        );
        if (error instanceof Error) {
          elizaLogger.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
          });
        }
        if (callback) {
          callback({
            text: `Issue with the launch: ${error instanceof Error ? error.message : 'Unknown error'}`,
            content: {
              error: error instanceof Error ? error.message : 'Unknown error',
              details: error instanceof Error ? error.stack : undefined,
            },
          });
        }
        return false;
      }
    } catch (error) {
      elizaLogger.error('Error during token launch:', error);
      if (error instanceof Error) {
        elizaLogger.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });
      }
      if (callback) {
        callback({
          text: `Issue with the launch: ${error instanceof Error ? error.message : 'Unknown error'}`,
          content: {
            error: error instanceof Error ? error.message : 'Unknown error',
            details: error instanceof Error ? error.stack : undefined,
          },
        });
      }
      return false;
    }
  },

  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Launch a new token called MyToken with symbol MTK',
        },
      },
      {
        user: '{{user2}}',
        content: {
          text: "Please provide a clear description of your token's purpose and utility",
          action: 'LAUNCH_TOKEN',
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
