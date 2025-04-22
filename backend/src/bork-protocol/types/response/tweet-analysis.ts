import { z } from 'zod';

export const qualityMetricsSchema = z
  .object({
    relevance: z.number().min(0).max(1),
    originality: z.number().min(0).max(1),
    clarity: z.number().min(0).max(1),
    authenticity: z.number().min(0).max(1),
    valueAdd: z.number().min(0).max(1),
  })
  .strict();

export const contentAnalysisSchema = z
  .object({
    type: z.enum([
      'news',
      'opinion',
      'announcement',
      'question',
      'promotion',
      'thought_leadership',
      'educational',
      'entertainment',
      'other',
    ]),
    format: z.enum([
      'statement',
      'question',
      'poll',
      'call_to_action',
      'thread',
      'image_focus',
      'video_focus',
      'link_share',
      'other',
    ]),
    sentiment: z.enum([
      'positive',
      'negative',
      'neutral',
      'controversial',
      'inspirational',
    ]),
    confidence: z.number().min(0).max(1),
    summary: z.string(),
    topics: z.array(z.string()),
    entities: z.array(z.string()),
    qualityMetrics: qualityMetricsSchema,
  })
  .strict();

export const marketingAnalysisSchema = z
  .object({
    summary: z.string(),
  })
  .strict();

export const spamAnalysisSchema = z
  .object({
    isSpam: z.boolean(),
    spamScore: z.number().min(0).max(1),
  })
  .strict();

export const tweetAnalysisSchema = z
  .object({
    contentAnalysis: contentAnalysisSchema,
    marketingAnalysis: marketingAnalysisSchema,
    spamAnalysis: spamAnalysisSchema,
  })
  .strict();

// TypeScript types matching the schema
export type QualityMetrics = z.infer<typeof qualityMetricsSchema>;
export type ContentAnalysis = z.infer<typeof contentAnalysisSchema>;
export type MarketingAnalysis = z.infer<typeof marketingAnalysisSchema>;
export type SpamAnalysis = z.infer<typeof spamAnalysisSchema>;

// This type matches the AI response format
export type TweetAnalysis = z.infer<typeof tweetAnalysisSchema>;

// This type matches the database schema
export interface DatabaseTweetAnalysis {
  tweet_id: string;
  type: string;
  format: string;
  sentiment: string;
  confidence: number;
  summary: string;
  topics: string[];
  entities: string[];
  relevance: number;
  originality: number;
  clarity: number;
  authenticity: number;
  valueAdd: number;
  likes: number;
  replies: number;
  retweets: number;
  created_at: Date;
  author_username: string;
  marketing_summary: string;
  is_spam: boolean;
  spam_score: number;
}

// Helper function to convert AI response to database format
export function convertToDbFormat(
  tweetId: string,
  analysis: TweetAnalysis,
  likes: number,
  replies: number,
  retweets: number,
  timestamp: Date,
  username: string,
): DatabaseTweetAnalysis {
  return {
    tweet_id: tweetId,
    type: analysis.contentAnalysis.type,
    format: analysis.contentAnalysis.format,
    sentiment: analysis.contentAnalysis.sentiment,
    confidence: analysis.contentAnalysis.confidence,
    summary: analysis.contentAnalysis.summary,
    topics: analysis.contentAnalysis.topics,
    entities: analysis.contentAnalysis.entities,
    relevance: analysis.contentAnalysis.qualityMetrics.relevance,
    originality: analysis.contentAnalysis.qualityMetrics.originality,
    clarity: analysis.contentAnalysis.qualityMetrics.clarity,
    authenticity: analysis.contentAnalysis.qualityMetrics.authenticity,
    valueAdd: analysis.contentAnalysis.qualityMetrics.valueAdd,
    likes,
    replies,
    retweets,
    created_at: timestamp,
    author_username: username,
    marketing_summary: analysis.marketingAnalysis.summary,
    is_spam: analysis.spamAnalysis.isSpam,
    spam_score: analysis.spamAnalysis.spamScore,
  };
}
