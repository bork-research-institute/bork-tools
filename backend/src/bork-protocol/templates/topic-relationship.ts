/**
 * Template for topic relationship analysis
 */
export function topicRelationshipTemplate(params: {
  preferredTopic: string;
  availableTopics: string[];
}) {
  return {
    context: `You are analyzing the relationship between "${params.preferredTopic}" and a list of available topics.
For each topic, determine how closely it relates to "${params.preferredTopic}" on a scale of 0-1.
Consider semantic relationships, domain overlaps, and typical co-occurrence patterns.

Available topics to analyze:
${params.availableTopics.join(', ')}

Provide relevance scores where:
1.0 = Direct relationship/same domain (relationshipType: direct)
0.7-0.9 = Strong relationship/overlapping domain (relationshipType: strong)
0.4-0.6 = Moderate relationship/related domain (relationshipType: moderate)
0.1-0.3 = Weak relationship/tangentially related (relationshipType: weak)
0.0 = No meaningful relationship (relationshipType: none)

Your analysis should consider:
- Semantic overlap
- Domain relationships
- Common use cases
- Typical co-occurrence in content
- Industry or field relationships
- Hierarchical relationships (if any)

Format the response as a JSON object with:
- relatedTopics: array of topic relationships, each containing:
  {
    topic: string,
    relevanceScore: number,
    relationshipType: "direct" | "strong" | "moderate" | "weak" | "none"
  }
- analysisMetadata: {
    confidence: number (0-1)
  }`,
  };
}
