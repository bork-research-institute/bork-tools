import type { TopicWeightRow } from '@/types/topic';
import type { RAGKnowledgeItem } from '@elizaos/core';

interface HypothesisTemplateInput {
  topicWeights: TopicWeightRow[];
  topicKnowledge: RAGKnowledgeItem[];
  lessonsLearned?: Array<{
    topic: string;
    whatWorked: string[];
    whatDidntWork: string[];
  }>;
}

export function hypothesisTemplate(input: HypothesisTemplateInput) {
  const { topicWeights, topicKnowledge, lessonsLearned = [] } = input;

  // Format topic weights for the prompt
  const topicWeightsSummary = topicWeights
    .map(
      (tw) => `
Topic: ${tw.topic}
Weight: ${tw.weight}
Impact Score: ${tw.impact_score}
Engagement Metrics:
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
      return `
Content: ${k.content.text}
Type: ${metadata.tweetType || 'unknown'}
Topics: ${Array.isArray(metadata.topics) ? metadata.topics.join(', ') : 'none'}
`;
    })
    .join('\n');

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
    context: `Your task is to analyze topics and knowledge to select the most promising topics for thread creation.

Recent Topic Performance:
${topicWeightsSummary}

Available Knowledge:
${knowledgeSummary}

${
  lessonsLearned.length > 0
    ? `
Previous Content Performance:
${lessonsLearnedSummary}
`
    : ''
}

Based on this data, select topics that would make engaging and informative threads. Consider:
- Topics with high engagement potential
- Topics where we have substantial knowledge
- Topics that could be combined for unique insights
- Topics that haven't been overused recently

Format your response as a JSON object with the following structure:
{
  "selectedTopics": [
    {
      "primaryTopic": string,
      "relatedTopics": string[],
      "relevantKnowledge": [
        {
          "content": string,
          "type": string,
          "useCase": string // How this knowledge could be used in the thread
        }
      ],
      "threadIdea": string, // Brief description of the thread concept
      "uniqueAngle": string, // What makes this thread unique/valuable
      "estimatedLength": number // Estimated number of tweets needed
    }
  ]
}`,
  };
}
