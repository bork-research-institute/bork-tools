import type { TopicRelationshipAnalysis } from '@/types/response/topic-relationship';

export const mockTopicRelationships: TopicRelationshipAnalysis = {
  relatedTopics: [
    {
      topic: 'cryptocurrency investment',
      relevanceScore: 1,
      relationshipType: 'direct',
    },
    {
      topic: 'blockchain',
      relevanceScore: 1,
      relationshipType: 'direct',
    },
    {
      topic: 'DeFi',
      relevanceScore: 0.9,
      relationshipType: 'strong',
    },
    {
      topic: 'token sales',
      relevanceScore: 0.9,
      relationshipType: 'strong',
    },
    {
      topic: 'economic transformation',
      relevanceScore: 0.6,
      relationshipType: 'moderate',
    },
    {
      topic: 'financial freedom',
      relevanceScore: 0.7,
      relationshipType: 'strong',
    },
    {
      topic: 'innovation',
      relevanceScore: 0.7,
      relationshipType: 'strong',
    },
    {
      topic: 'U.S. foreign policy',
      relevanceScore: 0.3,
      relationshipType: 'weak',
    },
    {
      topic: 'social media',
      relevanceScore: 0.4,
      relationshipType: 'moderate',
    },
  ],
  analysisMetadata: {
    confidence: 0.85,
    analysisFactors: [
      'Industry trends',
      'Recent market developments',
      'Historical data on crypto-related topics',
    ],
  },
};
