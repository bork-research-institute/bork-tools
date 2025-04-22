import type { TopicWeightRow } from '@/types/topic';
import type { RAGKnowledgeItem } from '@elizaos/core';

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
  lessonsLearned?: Array<{
    topic: string;
    whatWorked: string[];
    whatDidntWork: string[];
  }>;
}

export function hypothesisTemplate(input: HypothesisTemplateInput) {
  const { topicWeights, topicKnowledge, lessonsLearned = [] } = input;

  // Format topic weights and their associated knowledge
  const topicSummaries = topicWeights
    .map((tw) => {
      const knowledge = topicKnowledge.get(tw.topic) || [];
      const knowledgeSummary = knowledge
        .map((k) => {
          const metadata = k.content.metadata as KnowledgeMetadata;
          return `
Knowledge Item:
Content: ${k.content.text}
Source: Tweet ${metadata?.sourceId || 'unknown'} by @${metadata?.authorUsername || 'unknown'}
URL: ${metadata?.sourceUrl || 'unknown'}
Metrics: ${
            metadata?.publicMetrics
              ? `${metadata.publicMetrics.likes} likes, ${metadata.publicMetrics.retweets} retweets, ${metadata.publicMetrics.replies} replies`
              : 'No metrics available'
          }`;
        })
        .join('\n');

      return `
Topic: ${tw.topic}
Engagement Metrics:
- Likes: ${tw.engagement_metrics.likes}
- Retweets: ${tw.engagement_metrics.retweets}
- Replies: ${tw.engagement_metrics.replies}

Available Knowledge:
${knowledgeSummary}
`;
    })
    .join('\n---\n');

  // Format lessons learned
  const lessonsLearnedSummary = lessonsLearned
    .map(
      (lesson) => `
Topic: ${lesson.topic}
What Worked:
${lesson.whatWorked.map((item) => `- ${item}`).join('\n')}
What Didn't Work:
${lesson.whatDidntWork.map((item) => `- ${item}`).join('\n')}
`,
    )
    .join('\n');

  return {
    context: `You are an expert social media influencer and your task is to analyze topics and knowledge to select the SINGLE most promising topic for thread creation.
If there isn't sufficient data or engagement metrics to confidently create a thread that will perform well, return null for selectedTopic.

Available Topics and Their Knowledge:
${topicSummaries}

${
  lessonsLearned.length > 0
    ? `
Previous Content Performance:
${lessonsLearnedSummary}
`
    : ''
}

CRITICAL REQUIREMENTS FOR TOPIC SELECTION:
1. You MUST ONLY use the knowledge items explicitly provided above. DO NOT make up or assume additional information.
2. The knowledge items must contain concrete, actionable information.
3. You must be at least 75% confident that the selected topic and knowledge will provide genuine value to readers.
4. Knowledge must be sourced using a mention.

Return null for selectedTopic if ANY of these conditions are not met:
- Knowledge is too vague or not actionable
- Cannot achieve 75% confidence in the topic's value
- Knowledge items don't support a cohesive narrative
- Topic cannot be made specific enough

Topic Selection Criteria:
1. Topics with proven engagement (high likes, retweets, replies)
2. Topics where we have substantial, high-quality knowledge from the provided items
3. Topics that could be combined with related topics for unique insights
4. Topics that haven't been overused recently

Topic Requirements:
1. The selected topic MUST be highly specific - instead of broad topics like "cryptocurrency", choose specific aspects like "Bitcoin's Lightning Network adoption" or "DeFi yield farming strategies"
2. You must be able to construct a valuable thread using ONLY the provided knowledge items

Format your response as a JSON object with the following structure:
{
  "selectedTopic": { // null if ANY requirements are not met with 75% confidence
    "primaryTopic": string, // MUST be highly specific
    "relatedTopics": string[],
    "relevantKnowledge": [
      {
        "content": string, // MUST be copied exactly from the provided knowledge items
        "type": string,
        "useCase": string, // How this specific knowledge item will be used in the thread
        "source": {
          "tweetId": string, // MUST match the source ID from the knowledge item
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
    "threadIdea": string, // Brief description using ONLY insights from provided knowledge
    "uniqueAngle": string, // What makes this thread unique based on the actual knowledge provided
    "estimatedLength": number, // Realistic estimate based on knowledge amount
    "confidenceScore": number // Must be >= 0.75 to return a topic
  }
}`,
  };
}
