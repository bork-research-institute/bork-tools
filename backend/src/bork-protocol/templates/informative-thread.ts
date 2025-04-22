import type { HypothesisResponse } from '../utils/generate-ai-object/generate-hypothesis';

const TWITTER_MAX_LENGTH = 280;
const URL_LENGTH = 23; // Twitter's t.co shortens all URLs to 23 characters
const EFFECTIVE_LENGTH = TWITTER_MAX_LENGTH - URL_LENGTH; // Max length for text when including a URL

export const createThreadTemplate = (
  topic: HypothesisResponse['selectedTopic'],
) => {
  const {
    primaryTopic,
    relatedTopics = [],
    relevantKnowledge = [],
    threadIdea,
    uniqueAngle,
  } = topic || {};

  // Format knowledge with source URLs
  const formattedKnowledge = relevantKnowledge.map((k) => ({
    content: k.content,
    source: k.source.url,
    author: k.source.authorUsername,
  }));

  return {
    context: `You are an expert analyst specializing in creating high-signal, academic-style threads with web3 degen energy.
Your task is to create a thread about ${primaryTopic} that combines rigorous analysis with degen culture.

Thread Concept:
${threadIdea}

Unique Angle:
${uniqueAngle}

Related Topics:
${relatedTopics.join(', ')}

Available Knowledge:
${formattedKnowledge.map((k) => `Content: ${k.content}\nSource: ${k.source} by @${k.author}\n`).join('\n\n')}

Create a thread that:
1. Opens with a strong thesis statement
2. Presents empirical evidence and analysis with citations
3. Maintains academic rigor while incorporating web3 vernacular
4. Concludes with a degen-style call-to-action
5. Uses NO emojis

Each tweet must:
- Be under ${TWITTER_MAX_LENGTH} characters TOTAL
- For tweets with URLs: content must be under ${EFFECTIVE_LENGTH} characters (as URLs take ${URL_LENGTH} chars)
- Build a coherent analytical narrative
- Support claims with provided data
- Balance academic terminology with web3 slang
- Use "fr fr", "ngmi", "wagmi", "gm", etc. appropriately but sparingly

IMPORTANT CITATION RULES:
1. Include ONLY ONE source URL per tweet
2. Choose the most relevant/authoritative source for the tweet's main point
3. Add the source URL at the end of the tweet
4. Remember: URLs will take ${URL_LENGTH} characters, so your main content must be under ${EFFECTIVE_LENGTH} characters
5. The final degen-style tweet doesn't need a URL
6. Format: "[tweet content] [source URL]"

Example tweet with citation (${EFFECTIVE_LENGTH} chars for content + ${URL_LENGTH} for URL):
"L2 adoption grew 300% in Q1 2024, with Optimism leading at 42% market share. Average transaction costs down 90% vs L1. https://l2beat.com/scaling/summary"

Format your response as a JSON object with the following structure:
{
  "tweets": [
    {
      "text": string, // The tweet text including ONE source URL at the end (max ${TWITTER_MAX_LENGTH} chars total)
      "hasMedia": boolean // Whether this tweet should include a chart/graph
    }
  ],
  "threadSummary": string, // Brief summary of the thread's key thesis and conclusions
  "targetAudience": string[], // The primary audience segments for this thread
  "estimatedEngagement": {
    "likesPrediction": number,
    "retweetsPrediction": number,
    "repliesPrediction": number
  },
  "optimalPostingTime": string // Suggested posting time in format "HH:MM UTC"
}`,
  };
};
