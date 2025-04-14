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
    context: `${context}

# Task: Analyze Tweet Content
You are a PhD-level expert in social media marketing and AI prompt engineering with a deep understanding of Twitter engagement patterns and content effectiveness.

# Scoring Guidelines
All numeric scores should be between 0 and 1, interpreted as follows:

Content Analysis Scores:
- confidence: 0 = very uncertain, 1 = highly confident in analysis
- qualityMetrics.relevance: 0 = irrelevant to topics, 1 = perfectly aligned with topics
- qualityMetrics.originality: 0 = entirely derivative, 1 = highly original content
- qualityMetrics.clarity: 0 = confusing/unclear, 1 = crystal clear message
- qualityMetrics.authenticity: 0 = clearly inauthentic, 1 = genuinely authentic
- qualityMetrics.valueAdd: 0 = no value to readers, 1 = exceptional value

Spam Analysis Scores:
- spamScore: 0 = definitely not spam, 1 = certainly spam
Consider the following as high spam indicators (spamScore > 0.7):
- Giveaways and contests with minimal entry criteria
- "Follow and RT" style promotional content
- Cryptocurrency/NFT/token giveaways
- Affiliate marketing with no genuine content
- Mass-tagged promotional content
- Generic promotional content with no unique value
- Repetitive engagement-bait posts
- Excessive use of trending hashtags unrelated to content

# Instructions
Analyze this tweet${isThreadMerged ? ' thread' : ''} and provide strategic insights for social media engagement. Use the scoring guidelines above to assign appropriate values to all numeric fields.

Response format MUST be a JSON object with the following structure:
\`\`\`json
{
  "contentAnalysis": {
    "type": "news|opinion|announcement|question|promotion|thought_leadership|educational|entertainment|other",
    "format": "statement|question|poll|call_to_action|thread|image_focus|video_focus|link_share|other",
    "sentiment": "positive|negative|neutral|controversial|inspirational",
    "confidence": 0.5,
    "summary": "A detailed factual analysis that identifies key individuals/organizations, specific events/actions/claims, locations/platforms, timing/dates, motivations/reasons, and methods/processes. IMPORTANT: Every fact must be attributed to its source (e.g. 'According to @username...', 'The tweet states...', 'User @X claims...'). Include direct quotes where relevant and cite external references. Focus on extracting verifiable facts and knowledge rather than interpretations. Document any uncertainties or ambiguities.",
    "topics": ["topic1", "topic2", "topic3"],
    "entities": ["person1", "org1", "product1", "location1", "event1"],
    "qualityMetrics": {
      "relevance": 0.5,
      "originality": 0.5,
      "clarity": 0.5,
      "authenticity": 0.5,
      "valueAdd": 0.5
    }
  },
  "marketingAnalysis": {
    "summary": "A comprehensive analysis of engagement patterns, metrics significance, key engaging elements, content strategy effectiveness, audience insights, and actionable patterns. Include specific details about engagement metrics, successful content elements, topic resonance, timing effectiveness, audience segments, pain points addressed, successful phrases/approaches, and specific recommendations for improvement. Don't try to explain why it got those metrics. Just give guidelines on how to achieve those kinds of metrics based on what you see.",
  },
  "spamAnalysis": {
    "isSpam": false,
    "spamScore": 0.1
  }
}
\`\`\`
${messageCompletionFooter}`,
    modelClass: input.modelClass || ModelClass.MEDIUM,
  };
}
