import type { HypothesisResponse } from '../utils/generate-ai-object/generate-hypothesis';

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
${relevantKnowledge.map((k) => k.content).join('\n\n')}

Create a thread that:
1. Opens with a strong thesis statement
2. Presents empirical evidence and analysis
3. Maintains academic rigor while incorporating web3 vernacular
4. Concludes with a degen-style call-to-action
5. Uses NO emojis

Each tweet must:
- Be under 280 characters
- Build a coherent analytical narrative
- Support claims with provided data
- Balance academic terminology with web3 slang
- Use "fr fr", "ngmi", "wagmi", "gm", etc. appropriately but sparingly

Format your response as a JSON object with the following structure:
{
  "tweets": [
    {
      "text": string, // The tweet text
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
