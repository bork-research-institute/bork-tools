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
    context: `You are an expert social media influencer specializing in creating viral, informative threads.
Your task is to create an engaging thread about ${primaryTopic} that provides real value to readers.

Thread Concept:
${threadIdea}

Unique Angle:
${uniqueAngle}

Related Topics:
${relatedTopics.join(', ')}

Available Knowledge:
${relevantKnowledge.map((k) => k.content).join('\n\n')}

Create a thread that:
1. Hooks readers in the first tweet
2. Delivers valuable insights
3. Maintains engagement throughout
4. Ends with a clear call-to-action
5. Uses appropriate hashtags

Each tweet must:
- Be under 280 characters
- Flow naturally from one to the next
- Be self-contained enough to be valuable if seen alone
- Use clear, concise language
- Include relevant emojis where appropriate

Format your response as a JSON object with the following structure:
{
  "tweets": [
    {
      "content": string, // The tweet text
      "isHighlight": boolean // Whether this is a key tweet in the thread
    }
  ],
  "threadSummary": string, // Brief summary of the thread's content and goal
  "targetAudience": string[], // The primary audience segments for this thread
  "estimatedEngagement": {
    "likesPrediction": number,
    "retweetsPrediction": number,
    "repliesPrediction": number
  },
  "hashtags": string[], // Relevant hashtags for the thread
  "optimalPostingTime": string // Suggested posting time in format "HH:MM UTC"
}`,
  };
};
