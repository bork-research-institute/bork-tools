import {
  type ActionExample,
  type Evaluator,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  booleanFooter,
  composeContext,
  elizaLogger,
  generateObject,
} from '@elizaos/core';
import type { FieldGuidance } from './types';

interface TokenDetails {
  token: {
    name: string | null;
    symbol: string | null;
    description: string | null;
    base64: string | null;
    website: string | null;
    twitter: string | null;
    discord: string | null;
    telegram: string | null;
  };
  missingFields: string[] | null;
  fieldGuidance: FieldGuidance | null;
}

const shouldLaunchTemplate = `# Task: Evaluate if a token should be launched based on the conversation context.

  Look for messages that:
  - Mention creating or launching a new token
  - Describe token features, utility, or purpose
  - Discuss token economics or distribution
  - Express community interest or demand
  
  Based on the following conversation, should a token be launched? YES or NO

  {{recentMessages}}

  Should a token be launched? ${booleanFooter}`;

const tokenDetailsTemplate = `TASK: Extract token launch details from the conversation as a JSON object.

  Required fields and their format:
  - name: The full name of the token (e.g., "My Awesome Token")
  - symbol: The token's ticker symbol, usually 2-5 characters (e.g., "MAT")
  - description: A clear description of the token's purpose and utility

  Optional fields:
  - base64: Base64-encoded image for the token logo
  - website: Full URL of the token's website
  - twitter: Full Twitter profile URL
  - discord: Full Discord server invite URL
  - telegram: Full Telegram group/channel URL

  If any required field is missing or incomplete, return an object with:
  1. missingFields array listing the missing required fields
  2. fieldGuidance object explaining what information is needed for each missing field

  For the description field, ensure it includes:
  - The token's main purpose
  - Any specific utility or use cases
  - Target audience or community
  - Any unique features or benefits

  Recent Messages:
  {{recentMessages}}

  Response should be a JSON object inside a JSON markdown block. Correct response format:
  \`\`\`json
  {
    "token": {
      "name": string,
      "symbol": string,
      "description": string,
      "base64": string | null,
      "website": string | null,
      "twitter": string | null,
      "discord": string | null,
      "telegram": string | null
    },
    "missingFields": string[] | null,
    "fieldGuidance": {
      "name": string | null,
      "symbol": string | null,
      "description": string | null
    } | null
  }
  \`\`\``;

async function handler(runtime: IAgentRuntime, message: Memory) {
  const state = await runtime.composeState(message);

  // Check if we should process the messages for a token launch
  const shouldLaunchContext = composeContext({
    state,
    template: shouldLaunchTemplate,
  });

  const { object: shouldLaunch } = await generateObject({
    context: shouldLaunchContext,
    modelClass: ModelClass.SMALL,
    runtime,
  });

  if (!shouldLaunch) {
    elizaLogger.log('No token launch detected');
    return null;
  }

  const context = composeContext({
    state,
    template: tokenDetailsTemplate,
  });

  const { object: tokenDetails } = await generateObject({
    runtime,
    context,
    modelClass: ModelClass.LARGE,
  });

  if (!tokenDetails) {
    return {
      token: {
        name: null,
        symbol: null,
        description: null,
        base64: null,
        website: null,
        twitter: null,
        discord: null,
        telegram: null,
      },
      missingFields: ['name', 'symbol', 'description'],
      fieldGuidance: {
        name: 'Please provide the full name of your token (e.g., "My Awesome Token")',
        symbol:
          'Please provide a 2-5 character ticker symbol for your token (e.g., "MAT")',
        description:
          "Please provide a clear description of your token's purpose and utility",
      },
    };
  }

  const details = tokenDetails as TokenDetails;

  // If we have partial information, ensure we return proper guidance
  if (
    !details.token.name ||
    !details.token.symbol ||
    !details.token.description
  ) {
    const missingFields: string[] = [];
    const fieldGuidance: FieldGuidance = {
      name: null,
      symbol: null,
      description: null,
    };

    if (!details.token.name) {
      missingFields.push('name');
      fieldGuidance.name =
        'Please provide the full name of your token (e.g., "My Awesome Token")';
    }
    if (!details.token.symbol) {
      missingFields.push('symbol');
      fieldGuidance.symbol =
        'Please provide a 2-5 character ticker symbol for your token (e.g., "MAT")';
    }
    if (!details.token.description) {
      missingFields.push('description');
      fieldGuidance.description =
        "Please provide a clear description of your token's purpose and utility";
    }

    return {
      token: details.token,
      missingFields,
      fieldGuidance,
    };
  }

  return details;
}

export const tokenLaunchEvaluator: Evaluator = {
  name: 'EVALUATE_TOKEN_LAUNCH',
  similes: [
    'SHOULD_LAUNCH_TOKEN',
    'EVALUATE_TOKEN_CREATION',
    'CHECK_TOKEN_LAUNCH',
  ],
  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (message.content.text.length < 5) {
      return false;
    }

    // Only run for messages that explicitly mention launching or creating a token
    const text = message.content.text.toLowerCase();
    const tokenLaunchPhrases = [
      'launch a token',
      'create a token',
      'make a token',
      'generate a token',
      'initialize a token',
      'start a token',
      'new token',
    ];

    return (
      message.userId !== message.agentId &&
      tokenLaunchPhrases.some((phrase) => text.includes(phrase))
    );
  },
  description:
    'Evaluates if a token should be launched based on conversation context and extracts token launch details.',
  handler,
  examples: [
    {
      context: `Actors in the scene:
{{user1}}: DeFi developer with experience in token launches
{{user2}}: Community manager for various DeFi projects`,
      messages: [
        {
          user: '{{user1}}',
          content: {
            text: "I'm thinking of launching a new token called $MEME for our community. It'll be used for governance and staking rewards.",
          },
        },
        {
          user: '{{user2}}',
          content: {
            text: "That sounds interesting! What's the initial supply and how much SOL are you planning to seed the pool with?",
          },
        },
        {
          user: '{{user1}}',
          content: {
            text: "Planning for 1 billion tokens, and I'll seed with 5 SOL. We'll have a website at memetoken.io and active socials on Twitter and Discord.",
          },
        },
      ] as ActionExample[],
      outcome: `\`\`\`json
{
  "token": {
    "name": "MEME",
    "symbol": "MEME",
    "description": "Community token for governance and staking rewards",
    "base64": null,
    "website": "memetoken.io",
    "twitter": null,
    "discord": null,
    "telegram": null
  },
  "missingFields": null,
  "fieldGuidance": null
}
\`\`\``,
    },
  ],
};
