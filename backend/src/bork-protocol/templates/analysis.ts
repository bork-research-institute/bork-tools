import { ModelClass, messageCompletionFooter } from '@elizaos/core';

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
  modelClass?: ModelClass;
  structuredContent?: {
    mainTweet: string;
    replies: Array<{ text: string; username: string }>;
    quotes: Array<{ text: string; username: string }>;
    retweets: Array<{ text: string; username: string }>;
  };
}

export function tweetAnalysisTemplate(input: TweetAnalysisTemplateInput) {
  const {
    text,
    public_metrics,
    topicWeights,
    isThreadMerged,
    threadSize,
    originalText,
    structuredContent,
  } = input;

  // Format the content in a more structured way for the template
  let formattedContent = text;
  if (structuredContent) {
    formattedContent = [
      structuredContent.mainTweet,
      ...structuredContent.replies.map(
        (r) => `${r.text}\n(Reply by @${r.username})`,
      ),
      ...structuredContent.quotes.map(
        (q) => `${q.text}\n(Quote by @${q.username})`,
      ),
      ...structuredContent.retweets.map(
        (rt) => `${rt.text}\n(Retweet by @${rt.username})`,
      ),
    ].join('\n\n');
  }

  const context = `You are analyzing the following ${isThreadMerged ? 'thread' : 'tweet'}${threadSize && threadSize > 1 ? ` with ${threadSize} parts` : ''}:

Content:
${formattedContent}

${originalText !== text ? `Original Tweet:\n${originalText}\n\n` : ''}
Engagement Metrics:
- Likes: ${public_metrics.like_count}
- Retweets: ${public_metrics.retweet_count}
- Replies: ${public_metrics.reply_count}

Topic Weights:
${topicWeights.map((tw) => `- ${tw.topic}: ${tw.weight}`).join('\n')}

Please analyze this ${isThreadMerged ? 'thread' : 'tweet'} and provide a detailed analysis following the schema.`;

  return {
    context: `# Task: Analyze Tweet Content
You are a PhD-level expert in social media journalism with a quest to find truths from what others are posting online.

${context}

# Instructions
Ascertain the facts and opinions of users from tweet${isThreadMerged ? ' thread' : ''}.

# Scoring Guidelines
All numeric scores should be between 0 and 1

Spam Analysis Scores:
Consider the following as high spam indicators (spamScore > 0.7):
- Giveaways and contests with minimal entry criteria
- "Follow and RT" style promotional content
- Cryptocurrency/NFT/token giveaways
- Affiliate marketing with no genuine content
- Mass-tagged promotional content
- Generic promotional content with no unique value
- Repetitive engagement-bait posts
- Excessive use of trending hashtags unrelated to content

Response format MUST be a JSON object with the following structure with THREE top level fields (contentAnalysis, spamAnalysis, marketingAnalysis):
\`\`\`json
{
  "contentAnalysis": {
    "type": "news|opinion|announcement|question|promotion|thought_leadership|educational|entertainment|other",
    "format": "statement|question|poll|call_to_action|thread|image_focus|video_focus|link_share|other",
    "sentiment": "positive|negative|neutral|controversial|inspirational",
    "confidence": 0-1,
    "summary": "CONCISE factual analysis. Structure: [Key Claims] + [Supporting Evidence] + [Context]. Include ONLY: verified facts, direct quotes, specific data points, clear attributions. NO interpretations or speculation. Format: Claim: Evidence (Source). Omit filler words and redundant context.",
    "topics": ["topic1", "topic2", "topic3"],
    "entities": ["person1", "org1", "product1", "location1", "event1"],
    "qualityMetrics": {
      "relevance": 0-1,
      "originality": 0-1,
      "clarity": 0-1,
      "authenticity": 0-1,
      "valueAdd": 0-1
    }
  },
  "spamAnalysis": {
    "isSpam": true|false,
    "spamScore": 0-1
  },
  "marketingAnalysis": {
    "summary": "CONCISE engagement analysis. Structure: [Metrics Impact] + [Key Elements] + [Action Items]. Focus: quantifiable patterns, successful triggers, replicable tactics. Format: Pattern -> Impact -> Action. NO general advice or explanations. ONLY specific, actionable insights tied to observable data."
  }
}
\`\`\`
${messageCompletionFooter}`,
    modelClass: input.modelClass || ModelClass.MEDIUM,
  };
}
