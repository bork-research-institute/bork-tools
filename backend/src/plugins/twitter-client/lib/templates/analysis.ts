import type { ModelClass } from '@elizaos/core';

export interface TemplateOptions {
  modelClass?: ModelClass;
}

export interface TweetAnalysisTemplate {
  context: string;
  modelClass: ModelClass;
}

interface TweetAnalysisTemplateInput {
  text: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
  topics: string[];
  topicWeights: {
    topic: string;
    weight: number;
  }[];
  isThreadMerged?: boolean;
  threadSize?: number;
  originalText?: string;
}

export function tweetAnalysisTemplate(input: TweetAnalysisTemplateInput) {
  const {
    text,
    public_metrics,
    topicWeights,
    isThreadMerged,
    threadSize,
    originalText,
  } = input;

  return {
    context: `You are analyzing a tweet${isThreadMerged ? ' thread' : ''} with the following content:

${text}

${isThreadMerged ? `This is a merged thread of ${threadSize} tweets. Original first tweet was: "${originalText}"` : ''}

Public metrics:
- Likes: ${public_metrics.like_count}
- Retweets: ${public_metrics.retweet_count}
- Replies: ${public_metrics.reply_count}

Topics of interest (with weights):
${topicWeights.map((tw) => `- ${tw.topic} (${tw.weight})`).join('\n')}

Please analyze this tweet${isThreadMerged ? ' thread' : ''} and provide:
1. Content analysis (type, sentiment, topics, entities)
2. Spam analysis (is it spam, spam score, reasons if any)
3. Impact assessment (how relevant and impactful is this content)

IMPORTANT: You MUST respond with ONLY a valid JSON object as specified below.
Do NOT include any additional text, comments, explanations, or markdown formatting.
JSON ONLY - nothing else:

{
  "contentAnalysis": {
    "type": "news|opinion|announcement|question|other",
    "sentiment": "positive|negative|neutral",
    "confidence": 0.5,
    "topics": ["topic1", "topic2"],
    "entities": ["entity1", "entity2"],
    "metrics": {
      "relevance": 0.5,
      "quality": 0.5,
      "engagement": 0.5,
      "authenticity": 0.5,
      "valueAdd": 0.5
    },
    "impactScore": 0.5
  },
  "spamAnalysis": {
    "isSpam": false,
    "spamScore": 0.1,
    "reasons": ["reason1", "reason2"],
    "confidenceMetrics": {
      "linguisticRisk": 0.1,
      "topicMismatch": 0.1,
      "engagementAnomaly": 0.1,
      "promotionalIntent": 0.1
    }
  }
}

Do NOT include any formatting characters, explanations, or non-JSON content in your response. Your entire response should be valid parseable JSON.`,
  };
}
