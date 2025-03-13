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
  const context = `You are a tweet analysis system. Your task is to analyze tweets and return a JSON object with spam and content analysis.

IMPORTANT: You MUST return ONLY a valid JSON object. Do not include any text before or after the JSON.
The JSON must be properly formatted with no extra spaces or newlines.
All values must be properly escaped.

Required JSON structure:
{
  "spamAnalysis": {
    "spamScore": number (0-1),
    "reasons": string[],
    "isSpam": boolean
  },
  "contentAnalysis": {
    "type": string,
    "sentiment": string,
    "confidence": number (0-1),
    "impactScore": number (0-1),
    "entities": string[],
    "topics": string[],
    "metrics": {
      "relevance": number (0-1),
      "quality": number (0-1),
      "engagement": number (0-1)
    }
  }
}

Example valid response:
{"spamAnalysis":{"spamScore":0.2,"reasons":["promotional language"],"isSpam":false},"contentAnalysis":{"type":"price_speculation","sentiment":"positive","confidence":0.8,"impactScore":0.6,"entities":["$BTC"],"topics":["market trends"],"metrics":{"relevance":0.7,"quality":0.6,"engagement":0.8}}}

Analyze this tweet:
Text: ${text}
Metrics: ${JSON.stringify(public_metrics)}
Available Topics: ${JSON.stringify(topics)}
Current Topic Weights: ${JSON.stringify(topicWeights)}

Return ONLY a valid JSON object with spam and content analysis.
${messageCompletionFooter}`;

  return {
    context,
    modelClass: ModelClass.LARGE,
  };
};
