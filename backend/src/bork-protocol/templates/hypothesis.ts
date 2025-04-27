import type { TopicWeightRow } from '@/types/topic';
import type { RAGKnowledgeItem } from '@elizaos/core';
import type {
  PostedThread,
  TopicPerformance,
  UsedKnowledge,
} from '../db/schema';

interface KnowledgeMetadata {
  sourceId?: string;
  sourceUrl?: string;
  authorUsername?: string;
  publicMetrics?: {
    likes: number;
    retweets: number;
    replies: number;
  };
}

interface HypothesisTemplateInput {
  topicWeights: TopicWeightRow[];
  topicKnowledge: Map<string, RAGKnowledgeItem[]>;
  recentThreads?: PostedThread[];
  topicPerformance?: TopicPerformance[];
  recentlyUsedKnowledge?: UsedKnowledge[];
}

export function hypothesisTemplate(input: HypothesisTemplateInput) {
  const {
    topicWeights,
    topicKnowledge,
    recentThreads = [],
    topicPerformance = [],
    recentlyUsedKnowledge = [],
  } = input;

  // Create a summary of topic weights and performance
  const topicSummaries = topicWeights
    .map((tw) => {
      const performance = topicPerformance.find((tp) => tp.topic === tw.topic);
      const recentThreadsOnTopic = recentThreads.filter(
        (thread) =>
          thread.primaryTopic === tw.topic ||
          (thread.relatedTopics?.includes(tw.topic) ?? false),
      );

      const performanceSummary = performance
        ? `
- Average Engagement: ${JSON.stringify(performance.avgEngagement)}
- Performance Score: ${performance.performanceScore}
- Last Posted: ${performance.lastPosted}`
        : '';

      const recentThreadsSummary =
        recentThreadsOnTopic.length > 0
          ? `
- Recent Threads: ${recentThreadsOnTopic.map((thread) => thread.threadIdea).join(' | ')}`
          : '';

      return `Topic: ${tw.topic}
- Engagement: ${tw.engagement_metrics.likes} likes, ${tw.engagement_metrics.retweets} retweets, ${tw.engagement_metrics.replies} replies${performanceSummary}${recentThreadsSummary}`;
    })
    .join('\n\n');

  // Extract and flatten all knowledge items
  const allKnowledgeItems = topicWeights.flatMap((tw) => {
    const knowledge = topicKnowledge.get(tw.topic) || [];
    return knowledge.map((k) => {
      const metadata = k.content.metadata as KnowledgeMetadata;
      return {
        topic: tw.topic,
        knowledgeItem: k,
        content: k.content.text,
        source: {
          id: metadata?.sourceId || 'unknown',
          url: metadata?.sourceUrl || '',
          author: metadata?.authorUsername || '',
          metrics: metadata?.publicMetrics || {
            likes: 0,
            retweets: 0,
            replies: 0,
          },
        },
        isRecentlyUsed: recentlyUsedKnowledge.some(
          (uk) => uk.content === k.content.text,
        ),
        createdAt: k.createdAt || 0,
      };
    });
  });

  // Sort all knowledge items by recency (most recent first)
  const sortedKnowledgeItems = allKnowledgeItems.sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  // Format knowledge items
  const knowledgeItemsFormatted = sortedKnowledgeItems
    .map((item, index) => {
      const now = Date.now();
      const daysAgo = Math.floor(
        (now - item.createdAt) / (1000 * 60 * 60 * 24),
      );

      return `[${index + 1}] Topic: ${item.topic} (${daysAgo} days old) ${item.isRecentlyUsed ? '[RECENTLY USED]' : ''}
Content: ${item.content}
Source: Tweet ${item.source.id} by @${item.source.author}
URL: ${item.source.url}
Metrics: ${item.source.metrics.likes} likes, ${item.source.metrics.retweets} retweets, ${item.source.metrics.replies} replies`;
    })
    .join('\n\n');

  return {
    context: `You are an expert social media influencer and your task is to analyze topics and knowledge to select the SINGLE most promising topic for thread creation.

HISTORICAL TOPIC PERFORMANCE (from previous threads):
${topicSummaries}

KNOWLEDGE ITEMS (sorted by recency - most recent first):
${knowledgeItemsFormatted}

CRITICAL REQUIREMENTS:
1. You MUST ONLY use the knowledge items explicitly provided above
2. Prioritize RECENT knowledge (< 24 hours old if possible)
3. Look for connections between topics - combine knowledge from different topics if they relate to a specific angle
4. Create a NEW, highly SPECIFIC primary topic - not just one of the general topics listed
5. Include at least 5 knowledge items (or more if relevant) in the relevantKnowledge section
6. Avoid recently used knowledge items
7. Consider historical topic performance when making your selection

Format your response as a JSON object with the following structure:
{
  "selectedTopic": { // null if cannot create a compelling topic with 75% confidence
    "primaryTopic": string, // A NEW, highly specific synthesized topic
    "relatedTopics": string[],
    "relevantKnowledge": [
      {
        "content": string, // Copied exactly from the provided knowledge items
        "type": string,
        "useCase": string, // How this knowledge will be used in the thread
        "source": {
          "tweetId": string, // Match the source ID from the knowledge item
          "authorUsername": string,
          "url": string,
          "metrics": {
            "likes": number,
            "retweets": number,
            "replies": number
          }
        }
      }
    ],
    "threadIdea": string,
    "uniqueAngle": string,
    "estimatedLength": number,
    "confidenceScore": number // Must be >= 0.75
  }
}`,
  };
}
