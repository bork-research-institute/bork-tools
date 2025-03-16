interface SentimentIndicatorProps {
  sentiment: 'positive' | 'negative' | 'neutral';
}

export const SentimentIndicator = ({ sentiment }: SentimentIndicatorProps) => {
  if (sentiment === 'positive') {
    return <span className="text-emerald-400">↑ Positive</span>;
  }
  if (sentiment === 'negative') {
    return <span className="text-red-400">↓ Negative</span>;
  }
  return <span className="text-gray-400">− Neutral</span>;
};
