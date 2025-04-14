import { z } from 'zod';

export const qualityMetricsSchema = z.object({
  relevance: z.number().min(0).max(1),
  originality: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  authenticity: z.number().min(0).max(1),
  valueAdd: z.number().min(0).max(1),
});

export const contentAnalysisSchema = z.object({
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
});

export const marketingAnalysisSchema = z.object({
  summary: z.string(),
});

export const spamAnalysisSchema = z.object({
  isSpam: z.boolean(),
  spamScore: z.number().min(0).max(1),
});

export const tweetAnalysisSchema = z.object({
  contentAnalysis: contentAnalysisSchema,
  marketingAnalysis: marketingAnalysisSchema,
  spamAnalysis: spamAnalysisSchema,
});

// TypeScript types matching the schema
export type QualityMetrics = {
  relevance: number;
  originality: number;
  clarity: number;
  authenticity: number;
  valueAdd: number;
};

export type ContentAnalysis = {
  type:
    | 'news'
    | 'opinion'
    | 'announcement'
    | 'question'
    | 'promotion'
    | 'thought_leadership'
    | 'educational'
    | 'entertainment'
    | 'other';
  format:
    | 'statement'
    | 'question'
    | 'poll'
    | 'call_to_action'
    | 'thread'
    | 'image_focus'
    | 'video_focus'
    | 'link_share'
    | 'other';
  sentiment:
    | 'positive'
    | 'negative'
    | 'neutral'
    | 'controversial'
    | 'inspirational';
  confidence: number;
  summary: string;
  topics: string[];
  entities: string[];
  qualityMetrics: QualityMetrics;
};

export type MarketingAnalysis = {
  summary: string;
};

export type SpamAnalysis = {
  isSpam: boolean;
  spamScore: number;
};

export type TweetAnalysis = {
  contentAnalysis: ContentAnalysis;
  marketingAnalysis: MarketingAnalysis;
  spamAnalysis: SpamAnalysis;
};
