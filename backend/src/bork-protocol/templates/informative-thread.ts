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
  const formattedKnowledge = relevantKnowledge
    .filter((k) => k.source?.url) // Only include knowledge with valid source URLs
    .map((k) => ({
      content: k.content,
      source: k.source.url,
      author: k.source.authorUsername,
    }));

  const hasValidSources = formattedKnowledge.length > 0;
  const citationInstructions = hasValidSources
    ? `IMPORTANT CITATION RULES:
1. The FIRST tweet of the thread MUST NOT include a source URL, even if it contains factual claims. It should serve as a hook or thesis statement.
2. For subsequent tweets: You may ONLY use these verified sources:
${formattedKnowledge.map((k) => `   - ${k.source}`).join('\n')}
3. Include ONLY ONE source URL per tweet, chosen from the list above. 
4. Ensure that each source is only used ONCE throughout the thread.
5. Add the source URL at the end of the tweet
6. Remember: URLs will take ${URL_LENGTH} characters, so your main content must be under ${EFFECTIVE_LENGTH} characters
7. The final degen-style tweet doesn't need a URL
8. Format: "[tweet content] [source URL]"

Example tweet with citation (${EFFECTIVE_LENGTH} chars for content + ${URL_LENGTH} for URL):
"L2 adoption grew 300% in Q1 2024, with Optimism leading at 42% market share. Average transaction costs down 90% vs L1. ${formattedKnowledge[0]?.source || '[source URL]'}"`
    : `IMPORTANT: Since no verified sources are available, create the thread WITHOUT including any URLs or external citations. 
Focus on analysis and insights while maintaining academic rigor. Each tweet should be under ${TWITTER_MAX_LENGTH} characters.`;

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
1. Opens with a strong thesis statement that MUST end with a clear call-to-action to read the next tweet (e.g. "THREAD:", "Read on to learn why:", "Here's the breakdown:", "Let me explain:", "Full analysis in thread:")
2. Presents empirical evidence and analysis${hasValidSources ? ' with citations from the provided sources' : ' based on the available knowledge'}
3. Maintains academic rigor while incorporating web3 vernacular
4. Concludes with a degen-style call-to-action
5. Uses NO emojis

Each tweet must:
- Be under ${TWITTER_MAX_LENGTH} characters TOTAL
${hasValidSources ? `- For tweets with URLs: content must be under ${EFFECTIVE_LENGTH} characters (as URLs take ${URL_LENGTH} chars)` : ''}
- Build a coherent analytical narrative
- Support claims with provided data
- Balance academic terminology with web3 slang
- Use "fr fr", "ngmi", "wagmi", "gm", etc. appropriately but sparingly

${citationInstructions}

CRITICAL FORMATTING REQUIREMENTS:
- EVERY tweet in your response MUST include both "text" and "hasMedia" fields
- The "hasMedia" boolean indicates if a chart/graph should accompany the tweet
- This applies to ALL tweets including the final/concluding tweet
- Example format for EVERY tweet: {"text": "Tweet content here", "hasMedia": false}

Format your response as a JSON object with the following structure:
{
  "tweets": [
    {
      "text": string, // The tweet text (${hasValidSources ? 'first tweet: NO URL, others: ONE source URL from provided list' : 'no URLs'}, max ${TWITTER_MAX_LENGTH} chars total)
      "hasMedia": boolean // REQUIRED true or false for EVERY tweet
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
