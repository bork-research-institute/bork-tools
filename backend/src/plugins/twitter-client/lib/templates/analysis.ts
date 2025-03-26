import { ModelClass, messageCompletionFooter } from '@elizaos/core';

export interface TemplateOptions {
  modelClass?: ModelClass;
}

export interface TweetAnalysisTemplate {
  context: string;
  modelClass: ModelClass;
}

export const tweetAnalysisTemplate = ({
  text,
  public_metrics,
  topics,
  topicWeights,
}: {
  text: string;
  public_metrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
  };
  topics: string[];
  topicWeights: { topic: string; weight: number }[];
}): TweetAnalysisTemplate => {
  const context = `You are an advanced spam detection system. Your task is to analyze tweets and return a JSON object with detailed spam and content analysis.

Analyze this tweet:
Text: ${text}
Metrics: ${JSON.stringify(public_metrics)}
Available Topics: ${JSON.stringify(topics)}
Current Topic Weights: ${JSON.stringify(topicWeights)}

IMPORTANT: You MUST return ONLY a valid JSON object. Do not include any text before or after the JSON.
The JSON must be properly formatted with no extra spaces or newlines.
All values must be properly escaped.

Token Detection Rules:
1. Always scan the text for token tickers and symbols:
   - Common formats: $TICKER, $ticker, TICKER/USD
   - Known tokens: SOL, ETH, BTC, USDC, BORK, INJ, etc.
2. If a token is mentioned:
   - Add the token ticker to the topics list (e.g. "SOL", "INJ")
3. Multiple tokens can be included if mentioned
4. Only include tokens that are explicitly mentioned
5. Maintain case sensitivity for tickers (e.g. "SOL" not "sol")

CRITICAL ANALYSIS RULES:
- The presence of @mentions is NEVER a factor in spam detection
- Replies and conversations with multiple @mentions are normal and expected
- Focus ONLY on the actual content, links, and hashtags when detecting spam

Spam Detection Guidelines:

1. Primary Spam Indicators (Must have at least one):
   - Promotional Content:
     * Aggressive sales language ("Buy now!", "Don't miss out!")
     * Get-rich-quick promises
     * Multiple promotional links
   - Engagement Farming:
     * Follow-for-follow schemes
     * Giveaway spam ("RT & Follow to win!")
     * Mass-copied engagement bait

2. Secondary Spam Signals (Multiple required):
   - Hashtag Abuse:
     * More than 7 hashtags
     * Completely unrelated trending hashtags
   - Suspicious Patterns:
     * Exact duplicate tweets
     * Automated-looking content
     * Coordinated spam campaigns
   - Deceptive Tactics:
     * Fake celebrity endorsements
     * Obviously false claims
     * Phishing attempts

3. NOT Spam:
   - Normal Conversations:
     * Personal opinions
     * Questions and responses
     * Casual discussions
     * Emotional expressions
   - Regular Marketing:
     * Product announcements
     * Company updates
     * Professional promotions
   - Community Engagement:
     * Genuine discussions
     * Topic-specific hashtags
     * Industry news sharing

Spam Classification Rules:
1. Tweet is spam ONLY if it shows:
   - Clear promotional spam OR engagement farming
   - Multiple secondary spam signals
2. Do NOT mark as spam:
   - Regular conversations
   - Professional marketing
   - Industry discussions
   - News sharing
   - Personal updates
3. When in doubt, classify as non-spam

Example valid response for token discussion:
{"spamAnalysis":{"spamScore":0.1,"reasons":[],"isSpam":false,"confidenceMetrics":{"linguisticRisk":0.1,"topicMismatch":0.1,"engagementAnomaly":0.1,"promotionalIntent":0.1}},"contentAnalysis":{"type":"token_discussion","sentiment":"neutral","confidence":0.9,"impactScore":0.7,"entities":["SOL"],"topics":["SOL","governance"],"metrics":{"relevance":0.8,"quality":0.8,"engagement":0.7,"authenticity":0.9,"valueAdd":0.8}}}

Example valid response for actual spam:
{"spamAnalysis":{"spamScore":0.95,"reasons":["engagement farming giveaway","follow-for-follow scheme","automated content"],"isSpam":true,"confidenceMetrics":{"linguisticRisk":0.9,"topicMismatch":0.9,"engagementAnomaly":0.95,"promotionalIntent":0.95}},"contentAnalysis":{"type":"spam","sentiment":"manipulative","confidence":0.95,"impactScore":0.1,"entities":[],"topics":[],"metrics":{"relevance":0.1,"quality":0.1,"engagement":0.1,"authenticity":0.1,"valueAdd":0.1}}}

Required JSON structure:
{
  "spamAnalysis": {
    "spamScore": number (0-1),      // Overall spam probability score (0 = not spam, 1 = definitely spam)
    "reasons": string[],            // List of specific reasons why this might be spam (empty if not spam)
    "isSpam": boolean,             // Final spam classification (true if spamScore > threshold)
    "confidenceMetrics": {
      "linguisticRisk": number (0-1),     // Risk based on text patterns, language, and content
      "topicMismatch": number (0-1),      // How well the content matches expected topics
      "engagementAnomaly": number (0-1),  // Unusual patterns in likes, retweets, or replies
      "promotionalIntent": number (0-1)    // Likelihood the tweet is promotional content
    }
  },
  "contentAnalysis": {
    "type": string,               // Category of content (e.g., "token_discussion", "market_analysis", "news", "spam")
    "sentiment": string,          // Emotional tone (e.g., "positive", "negative", "neutral", "manipulative")
    "confidence": number (0-1),   // Confidence in the analysis results
    "impactScore": number (0-1),  // Overall impact/importance score of the tweet
    "entities": string[],         // Named entities found in the tweet (e.g., projects, protocols, people)
    "topics": string[],           // Relevant topics discussed (including detected token tickers)
    "metrics": {
      "relevance": number (0-1),    // How relevant the content is to tracked topics
      "quality": number (0-1),      // Overall quality of the content and discussion
      "engagement": number (0-1),    // Level of meaningful community engagement
      "authenticity": number (0-1),  // How genuine/authentic the content appears
      "valueAdd": number (0-1)       // How much value the tweet adds to the discussion
    }
  }
}

Return ONLY a valid JSON object with spam and content analysis.
${messageCompletionFooter}`;

  return {
    context,
    modelClass: ModelClass.MEDIUM,
  };
};
