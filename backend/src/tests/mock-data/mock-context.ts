import type { Memory } from '@elizaos/core';

export interface MockContext {
  template: string;
  state: {
    memory: Memory;
    [key: string]: unknown;
  };
  knowledgeContext: string;
}

// This file is auto-generated from process-single-tweet-context.test.ts
// Last updated: 2025-04-09T21:18:03.737Z

export const generatedContext: MockContext = {
  template:
    'You are analyzing the following thread with 4 parts:\n\nContent:\njoke?\n\n\nEngagement Metrics:\n- Likes: 11\n- Retweets: 1\n- Replies: 3\n\nTopic Weights:\n- foreign investment: 0.838341144010162\n- economic transformation: 0.838341144010162\n- happiness: 0.820175529713051\n\nPlease analyze this thread and provide a detailed analysis following the schema.\n\n# Task: Analyze Tweet Content\nYou are a PhD-level expert in social media marketing and AI prompt engineering with a deep understanding of Twitter engagement patterns and content effectiveness.\n\n# Scoring Guidelines\nAll numeric scores should be between 0 and 1, interpreted as follows:\n\nContent Analysis Scores:\n- confidence: 0 = very uncertain, 1 = highly confident in analysis\n- qualityMetrics.relevance: 0 = irrelevant to topics, 1 = perfectly aligned with topics\n- qualityMetrics.originality: 0 = entirely derivative, 1 = highly original content\n- qualityMetrics.clarity: 0 = confusing/unclear, 1 = crystal clear message\n- qualityMetrics.authenticity: 0 = clearly inauthentic, 1 = genuinely authentic\n- qualityMetrics.valueAdd: 0 = no value to readers, 1 = exceptional value\n\nEngagement Scores:\n- engagementAnalysis.overallScore: 0 = poor engagement, 1 = excellent engagement\n- engagementAnalysis.virality: 0 = unlikely to spread, 1 = highly viral potential\n- engagementAnalysis.conversionPotential: 0 = unlikely to convert, 1 = high conversion probability\n- engagementAnalysis.communityBuilding: 0 = isolating content, 1 = strong community building\n- engagementAnalysis.thoughtLeadership: 0 = follower content, 1 = industry-leading insight\n\nMarketing Scores:\n- trendAlignment.relevanceScore: 0 = disconnected from trends, 1 = perfectly aligned with trends\n- copywriting.callToAction.effectiveness: 0 = ineffective CTA, 1 = highly compelling CTA\n\nSpam Analysis Scores:\n- spamScore: 0 = definitely not spam, 1 = certainly spam\n- confidenceMetrics.linguisticRisk: 0 = natural language, 1 = highly suspicious patterns\n- confidenceMetrics.topicMismatch: 0 = perfectly aligned topics, 1 = completely unrelated\n- confidenceMetrics.engagementAnomaly: 0 = normal engagement pattern, 1 = highly suspicious\n- confidenceMetrics.promotionalIntent: 0 = non-promotional, 1 = purely promotional\n- confidenceMetrics.accountTrustSignals: 0 = highly trustworthy, 1 = untrustworthy\n\n# Instructions\nAnalyze this tweet thread and provide strategic insights for social media engagement. Use the scoring guidelines above to assign appropriate values to all numeric fields.\n\nResponse format MUST be a JSON object with the following structure:\n```json\n{\n  "contentAnalysis": {\n    "type": "news|opinion|announcement|question|promotion|thought_leadership|educational|entertainment|other",\n    "format": "statement|question|poll|call_to_action|thread|image_focus|video_focus|link_share|other",\n    "sentiment": "positive|negative|neutral|controversial|inspirational",\n    "confidence": 0.5,\n    "primaryTopics": ["topic1", "topic2"],\n    "secondaryTopics": ["topic3", "topic4"],\n    "entities": {\n      "people": ["person1", "person2"],\n      "organizations": ["org1", "org2"],\n      "products": ["product1", "product2"],\n      "locations": ["location1", "location2"],\n      "events": ["event1", "event2"]\n    },\n    "hashtagsUsed": ["hashtag1", "hashtag2"],\n    "qualityMetrics": {\n      "relevance": 0.5,\n      "originality": 0.5,\n      "clarity": 0.5,\n      "authenticity": 0.5,\n      "valueAdd": 0.5\n    },\n    "engagementAnalysis": {\n      "overallScore": 0.5,\n      "virality": 0.5,\n      "conversionPotential": 0.5,\n      "communityBuilding": 0.5,\n      "thoughtLeadership": 0.5\n    }\n  },\n  "marketingInsights": {\n    "targetAudience": ["audience1", "audience2"],\n    "keyTakeaways": ["takeaway1", "takeaway2"],\n    "contentStrategies": {\n      "whatWorked": ["element1", "element2"],\n      "improvement": ["suggestion1", "suggestion2"]\n    },\n    "trendAlignment": {\n      "currentTrends": ["trend1", "trend2"],\n      "emergingOpportunities": ["opportunity1", "opportunity2"],\n      "relevanceScore": 0.5\n    },\n    "copywriting": {\n      "effectiveElements": ["element1", "element2"],\n      "hooks": ["hook1", "hook2"],\n      "callToAction": {\n        "present": true,\n        "type": "follow|click|share|reply|other",\n        "effectiveness": 0.5\n      }\n    }\n  },\n  "actionableRecommendations": {\n    "engagementStrategies": [\n      {\n        "action": "description of specific action to take",\n        "rationale": "brief explanation of why",\n        "priority": "high|medium|low",\n        "expectedOutcome": "brief description of expected result"\n      }\n    ],\n    "contentCreation": [\n      {\n        "contentType": "type of content to create",\n        "focus": "specific focus area",\n        "keyElements": ["element1", "element2"]\n      }\n    ],\n    "networkBuilding": [\n      {\n        "targetType": "user|community|hashtag",\n        "target": "specific target name",\n        "approach": "brief description of approach",\n        "value": "description of potential value"\n      }\n    ]\n  },\n  "spamAnalysis": {\n    "isSpam": false,\n    "spamScore": 0.1,\n    "reasons": ["reason1", "reason2"],\n    "confidenceMetrics": {\n      "linguisticRisk": 0.1,\n      "topicMismatch": 0.1,\n      "engagementAnomaly": 0.1,\n      "promotionalIntent": 0.1,\n      "accountTrustSignals": 0.1\n    }\n  }\n}\n```\n\nResponse format should be formatted in a valid JSON block like this:\n```json\n{ "user": "{{agentName}}", "text": "<string>", "action": "<string>" }\n```\n\nThe “action” field should be one of the options in [Available Actions] and the "text" field should be the response you want to send.\n',
  state: {
    memory: {
      content: {
        text: 'joke?',
        isThreadMerged: true,
        threadSize: 4,
        originalText: 'joke?',
      },
      userId: 'e8358370-c47d-0228-9472-3cd998786d7e',
      agentId: 'b8af647b-f617-0ae3-ab07-acb81861d7e2',
      roomId: 'e8b9f607-df72-0e4d-8920-01c2a57b043e',
    },
    agentId: 'b8af647b-f617-0ae3-ab07-acb81861d7e2',
    agentName: 'Test Agent',
    bio: 'Test agent for unit testing',
    lore: 'Created for testing Eliza agent functionality',
    adjective: 'precise',
    knowledge: '',
    knowledgeData: [],
    ragKnowledgeData: [],
    recentMessageInteractions: '',
    recentPostInteractions: '',
    recentInteractionsData: [],
    topic: 'agents',
    topics: 'Test Agent is interested in testing and agents',
    characterPostExamples: '',
    characterMessageExamples: '',
    messageDirections:
      '# Message Directions for Test Agent\nbe concise\nbe helpful\nrespond clearly\n',
    postDirections:
      '# Post Directions for Test Agent\nbe concise\nbe helpful\nwrite clearly\n',
    actors: '',
    actorsData: [],
    roomId: 'e8b9f607-df72-0e4d-8920-01c2a57b043e',
    goals: '',
    goalsData: [],
    recentMessages: '',
    recentPosts: '',
    recentMessagesData: [],
    attachments: '',
    twitterService: {},
    twitterUserName: 'bork_agent',
    currentPost: 'joke?',
    actionNames: 'Possible response actions: ',
    actions: '',
    actionExamples: '',
    evaluatorsData: [],
    evaluators: '',
    evaluatorNames: '',
    evaluatorExamples: '',
    providers: '',
  },
  knowledgeContext:
    'Relevant Knowledge:\n- joke?\n\n[Reply from @x256xx]\n@myAlphaDrops @Bybit_Official @use_corn 8 billion\n\n[Reply from @myAlphaDrops]\n@Bybit_Official @use_corn So, $CORN TGE in 2 days\n\nHow many points do you have?\n\n[Reply from @Bybit_Official]\n📣 $CORN is coming soon to the #BybitSpot trading platform with @use_corn!\n\nListing time: Mar 28th, 10AM UTC. Stay tuned for more!\n\n#BybitListing #TheCryptoArk https://t.co/Q7a9IUsn21\nKey Points:\n  - Test point 1\n  - Test point 2\n\nType: test\nConfidence: unknown\nSimilarity: 0.71\nTopics: none\nImpact Score: 0.5\nEngagement: Likes: 0, Retweets: 0, Replies: 0\nIs Opinion: No\nIs Factual: No\nHas Question: No\n\n- 📣 $CORN is coming to Bybit Spot trading platform! Listing scheduled for March 28th at 10AM UTC. This is a significant development for the CORN ecosystem.\nKey Points:\n  - CORN token listing on Bybit\n  - Listing date: March 28th, 10AM UTC\n  - Partnership between Bybit and CORN project\n  - New trading opportunities on Bybit Spot\n\nType: announcement\nConfidence: unknown\nSimilarity: 0.17\nTopics: cryptocurrency, token_listing, trading, defi\nImpact Score: 0.8\nEngagement: Likes: 0, Retweets: 0, Replies: 0\nIs Opinion: No\nIs Factual: No\nHas Question: No\n\nType: test\nConfidence: unknown\nSimilarity: 1.27\nTopics: none\nImpact Score: 0.5\nEngagement: Likes: 0, Retweets: 0, Replies: 0\nIs Opinion: No\nIs Factual: No\nHas Question: No\n\nType: announcement\nConfidence: unknown\nSimilarity: 0.42\nTopics: cryptocurrency, token_listing, trading, defi\nImpact Score: 0.8\nEngagement: Likes: 0, Retweets: 0, Replies: 0\nIs Opinion: No\nIs Factual: No\nHas Question: No\n\nType: test\nConfidence: unknown\nSimilarity: 0.48\nTopics: none\nImpact Score: 0.5\nEngagement: Likes: 0, Retweets: 0, Replies: 0\nIs Opinion: No\nIs Factual: No\nHas Question: No\n\nType: announcement\nConfidence: unknown\nSimilarity: 0.41\nTopics: cryptocurrency, token_listing, trading, defi\nImpact Score: 0.8\nEngagement: Likes: 0, Retweets: 0, Replies: 0\nIs Opinion: No\nIs Factual: No\nHas Question: No\n\nRelevant Knowledge:\n- 📣 $CORN is coming to Bybit Spot trading platform! Listing scheduled for March 28th at 10AM UTC. This is a significant development for the CORN ecosystem.\nKey Points:\n  - CORN token listing on Bybit\n  - Listing date: March 28th, 10AM UTC\n  - Partnership between Bybit and CORN project\n  - New trading opportunities on Bybit Spot\n\nType: announcement\nConfidence: unknown\nSimilarity: 0.94\nTopics: cryptocurrency, token_listing, trading, defi\nImpact Score: 0.8\nEngagement: Likes: 0, Retweets: 0, Replies: 0\nIs Opinion: No\nIs Factual: No\nHas Question: No\n\n- joke?\n\nType: test\nConfidence: unknown\nSimilarity: 0.68\nTopics: none\nImpact Score: 0.5\nEngagement: Likes: 0, Retweets: 0, Replies: 0\nIs Opinion: No\nIs Factual: No\nHas Question: No',
};
