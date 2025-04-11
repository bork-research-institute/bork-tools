import type { TopicWeightRow } from '@/types/topic';
import type { RAGKnowledgeItem } from '@elizaos/core';

interface HypothesisTemplateInput {
  topicWeights: TopicWeightRow[];
  topicKnowledge: RAGKnowledgeItem[];
  currentFollowers: number;
  averageImpressions: number;
  engagementRate: number;
}

interface PublicMetrics {
  likes: number;
  retweets: number;
  replies: number;
}

export function hypothesisTemplate(input: HypothesisTemplateInput) {
  const {
    topicWeights,
    topicKnowledge,
    currentFollowers,
    averageImpressions,
    engagementRate,
  } = input;

  // Format topic weights for the prompt
  const topicWeightsSummary = topicWeights
    .map(
      (tw) => `
Topic: ${tw.topic}
Weight: ${tw.weight}
Impact Score: ${tw.impact_score}
Engagement Metrics:
- Likes: ${tw.engagement_metrics.likes}
- Retweets: ${tw.engagement_metrics.retweets}
- Replies: ${tw.engagement_metrics.replies}
- Virality: ${tw.engagement_metrics.virality}
- Conversion: ${tw.engagement_metrics.conversionPotential}
- Community: ${tw.engagement_metrics.communityBuilding}
- Thought Leadership: ${tw.engagement_metrics.thoughtLeadership}
`,
    )
    .join('\n');

  // Format knowledge items for the prompt
  const knowledgeSummary = topicKnowledge
    .map((k) => {
      const metadata = k.content.metadata;
      const metrics = metadata.publicMetrics as PublicMetrics | undefined;
      return `
Content: ${k.content.text}
Type: ${metadata.tweetType || 'unknown'}
Impact: ${metadata.impactScore || 'unknown'}
Engagement: ${
        metrics
          ? `Likes: ${metrics.likes}, Retweets: ${metrics.retweets}, Replies: ${metrics.replies}`
          : 'unknown'
      }
Topics: ${Array.isArray(metadata.topics) ? metadata.topics.join(', ') : 'none'}
`;
    })
    .join('\n');

  return {
    context: `You are a strategic social media growth expert specializing in X (formerly Twitter). Your task is to analyze recent topic performance and knowledge to generate hypotheses about what content will grow the account.

Current Account Metrics:
- Followers: ${currentFollowers}
- Average Impressions per Post: ${averageImpressions}
- Engagement Rate: ${engagementRate}

Recent Topic Performance:
${topicWeightsSummary}

Relevant Knowledge:
${knowledgeSummary}

Based on this data, generate hypotheses about what types of content and projects will best grow the account. Consider:

1. Topic Selection
- Which topics show the most engagement potential?
- What topic combinations could create unique value?
- Which topics align with current trends?

2. Content Strategy
- What content formats work best for each topic?
- How can we improve engagement metrics?
- What unique angles or perspectives can we offer?

3. Growth Potential
- Which approaches could attract quality followers?
- How can we maximize impressions?
- What strategies could increase engagement?

Format your response as a JSON object with the following structure:
{
  "hypotheses": [
    {
      "projectName": string,
      "primaryTopic": string,
      "relatedTopics": string[],
      "contentStrategy": {
        "format": "thread|carousel|poll|video|mixed",
        "numberOfPosts": number,
        "keyElements": string[],
        "uniqueAngles": string[]
      },
      "growthPotential": {
        "estimatedImpressions": number,
        "targetEngagementRate": number,
        "followerGrowthEstimate": number
      },
      "rationale": string,
      "confidenceScore": number,
      "risks": string[],
      "successMetrics": {
        "minimumEngagement": number,
        "targetImpressions": number,
        "expectedFollowerGain": number
      }
    }
  ],
  "overallStrategy": {
    "recommendedFrequency": string,
    "topicDistribution": [
      {
        "topic": string,
        "percentage": number
      }
    ],
    "contentMix": [
      {
        "format": string,
        "percentage": number
      }
    ]
  },
  "marketingInsights": {
    "targetAudience": string[],
    "uniqueValueProposition": string,
    "competitiveAdvantage": string[],
    "growthLevers": string[]
  }
}`,
  };
}
