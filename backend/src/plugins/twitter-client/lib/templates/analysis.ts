import { ModelClass, messageCompletionFooter } from '@elizaos/core';

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
  modelClass?: ModelClass;
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
    context: `# Task: Analyze Tweet Content
You are a PhD-level expert in social media marketing and AI prompt engineering with a deep understanding of Twitter engagement patterns and content effectiveness.

# Content to Analyze
Tweet${isThreadMerged ? ' Thread' : ''}:
${text}

${isThreadMerged ? `\nThread Context: This is a merged thread of ${threadSize} tweets. Original first tweet was: "${originalText}"` : ''}

# Metrics
Public Engagement:
- Likes: ${public_metrics.like_count}
- Retweets: ${public_metrics.retweet_count}
- Replies: ${public_metrics.reply_count}

Topics of Interest (with weights):
${topicWeights.map((tw) => `- ${tw.topic} (${tw.weight})`).join('\n')}

# Scoring Guidelines
All numeric scores should be between 0 and 1, interpreted as follows:

Content Analysis Scores:
- confidence: 0 = very uncertain, 1 = highly confident in analysis
- qualityMetrics.relevance: 0 = irrelevant to topics, 1 = perfectly aligned with topics
- qualityMetrics.originality: 0 = entirely derivative, 1 = highly original content
- qualityMetrics.clarity: 0 = confusing/unclear, 1 = crystal clear message
- qualityMetrics.authenticity: 0 = clearly inauthentic, 1 = genuinely authentic
- qualityMetrics.valueAdd: 0 = no value to readers, 1 = exceptional value

Engagement Scores:
- engagementAnalysis.overallScore: 0 = poor engagement, 1 = excellent engagement
- engagementAnalysis.virality: 0 = unlikely to spread, 1 = highly viral potential
- engagementAnalysis.conversionPotential: 0 = unlikely to convert, 1 = high conversion probability
- engagementAnalysis.communityBuilding: 0 = isolating content, 1 = strong community building
- engagementAnalysis.thoughtLeadership: 0 = follower content, 1 = industry-leading insight

Marketing Scores:
- trendAlignment.relevanceScore: 0 = disconnected from trends, 1 = perfectly aligned with trends
- copywriting.callToAction.effectiveness: 0 = ineffective CTA, 1 = highly compelling CTA

Spam Analysis Scores:
- spamScore: 0 = definitely not spam, 1 = certainly spam
- confidenceMetrics.linguisticRisk: 0 = natural language, 1 = highly suspicious patterns
- confidenceMetrics.topicMismatch: 0 = perfectly aligned topics, 1 = completely unrelated
- confidenceMetrics.engagementAnomaly: 0 = normal engagement pattern, 1 = highly suspicious
- confidenceMetrics.promotionalIntent: 0 = non-promotional, 1 = purely promotional
- confidenceMetrics.accountTrustSignals: 0 = highly trustworthy, 1 = untrustworthy

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
    "primaryTopics": ["topic1", "topic2"],
    "secondaryTopics": ["topic3", "topic4"],
    "entities": {
      "people": ["person1", "person2"],
      "organizations": ["org1", "org2"],
      "products": ["product1", "product2"],
      "locations": ["location1", "location2"],
      "events": ["event1", "event2"]
    },
    "hashtagsUsed": ["hashtag1", "hashtag2"],
    "qualityMetrics": {
      "relevance": 0.5,
      "originality": 0.5,
      "clarity": 0.5,
      "authenticity": 0.5,
      "valueAdd": 0.5
    },
    "engagementAnalysis": {
      "overallScore": 0.5,
      "virality": 0.5,
      "conversionPotential": 0.5,
      "communityBuilding": 0.5,
      "thoughtLeadership": 0.5
    }
  },
  "marketingInsights": {
    "targetAudience": ["audience1", "audience2"],
    "keyTakeaways": ["takeaway1", "takeaway2"],
    "contentStrategies": {
      "whatWorked": ["element1", "element2"],
      "improvement": ["suggestion1", "suggestion2"]
    },
    "trendAlignment": {
      "currentTrends": ["trend1", "trend2"],
      "emergingOpportunities": ["opportunity1", "opportunity2"],
      "relevanceScore": 0.5
    },
    "copywriting": {
      "effectiveElements": ["element1", "element2"],
      "hooks": ["hook1", "hook2"],
      "callToAction": {
        "present": true,
        "type": "follow|click|share|reply|other",
        "effectiveness": 0.5
      }
    }
  },
  "actionableRecommendations": {
    "engagementStrategies": [
      {
        "action": "description of specific action to take",
        "rationale": "brief explanation of why",
        "priority": "high|medium|low",
        "expectedOutcome": "brief description of expected result"
      }
    ],
    "contentCreation": [
      {
        "contentType": "type of content to create",
        "focus": "specific focus area",
        "keyElements": ["element1", "element2"]
      }
    ],
    "networkBuilding": [
      {
        "targetType": "user|community|hashtag",
        "target": "specific target name",
        "approach": "brief description of approach",
        "value": "description of potential value"
      }
    ]
  },
  "spamAnalysis": {
    "isSpam": false,
    "spamScore": 0.1,
    "reasons": ["reason1", "reason2"],
    "confidenceMetrics": {
      "linguisticRisk": 0.1,
      "topicMismatch": 0.1,
      "engagementAnomaly": 0.1,
      "promotionalIntent": 0.1,
      "accountTrustSignals": 0.1
    }
  }
}
\`\`\`
${messageCompletionFooter}`,
    modelClass: input.modelClass || ModelClass.MEDIUM,
  };
}
