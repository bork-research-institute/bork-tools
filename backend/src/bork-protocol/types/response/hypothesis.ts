import { z } from 'zod';

const TWITTER_MAX_LENGTH = 280;
const URL_LENGTH = 23; // Twitter's t.co shortens all URLs to 23 characters

const relevantKnowledgeSchema = z.object({
  content: z.string(),
  type: z.string(),
  useCase: z.string(),
  source: z.object({
    tweetId: z.string(),
    authorUsername: z.string(),
    url: z.string(),
    metrics: z.object({
      likes: z.number(),
      retweets: z.number(),
      replies: z.number(),
    }),
  }),
});

export const tweetSchema = z.object({
  text: z.string().refine(
    (text) => {
      // Find URLs in the tweet using a regex
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = text.match(urlRegex) || [];

      // Replace each URL with a 23-character placeholder (Twitter's t.co length)
      let processedText = text;
      for (const url of urls) {
        processedText = processedText.replace(url, 'x'.repeat(URL_LENGTH));
      }

      return processedText.length <= TWITTER_MAX_LENGTH;
    },
    {
      message: `Tweet exceeds ${TWITTER_MAX_LENGTH} characters (including URL shortening to ${URL_LENGTH} chars)`,
    },
  ),
  hasMedia: z.boolean(),
});

export const selectedTopicSchema = z.object({
  primaryTopic: z.string(),
  relatedTopics: z.array(z.string()),
  relevantKnowledge: z.array(relevantKnowledgeSchema),
  threadIdea: z.string(),
  uniqueAngle: z.string(),
  estimatedLength: z.number().min(1),
  confidenceScore: z.number().min(0.75),
});

export const hypothesisResponseSchema = z.object({
  selectedTopic: selectedTopicSchema.nullable(),
});

export type HypothesisResponse = z.infer<typeof hypothesisResponseSchema>;
export type SelectedTopic = z.infer<typeof selectedTopicSchema>;
export type Tweet = z.infer<typeof tweetSchema>;

export type LessonLearned = {
  topic: string;
  whatWorked: string[];
  whatDidntWork: string[];
};

export const topicSuggestionsSchema = z.object({
  selectedTopics: z.array(selectedTopicSchema),
});

export type TopicSuggestionsResponse = z.infer<typeof topicSuggestionsSchema>;
