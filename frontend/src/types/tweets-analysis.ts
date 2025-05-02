export interface TweetAnalysis {
  id: string;
  ticker: string;
  tweet_text: string;
  author: string;
  timestamp: string;
  sentiment?: string;
}
