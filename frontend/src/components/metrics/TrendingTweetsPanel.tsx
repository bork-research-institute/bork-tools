import { Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { mockTrendingTweets } from '../../mocks/metricsData';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Panel } from './Panel';

interface UserFilter {
  username: string;
  enabled: boolean;
}

export function TrendingTweetsPanel({ onClose }: { onClose: () => void }) {
  const [userFilters, setUserFilters] = useState<UserFilter[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Calculate engagement score and sort tweets
  const sortedTweets = useMemo(() => {
    return [...mockTrendingTweets]
      .map((tweet) => ({
        ...tweet,
        engagementScore:
          tweet.metrics.retweets * 3 +
          tweet.metrics.comments * 2 +
          tweet.metrics.likes,
      }))
      .sort((a, b) => (b.engagementScore || 0) - (a.engagementScore || 0))
      .filter(
        (tweet) =>
          userFilters.length === 0 ||
          userFilters.some(
            (filter) =>
              filter.enabled &&
              tweet.authorUsername.toLowerCase() ===
                filter.username.toLowerCase(),
          ),
      );
  }, [userFilters]);

  const handleAddUser = useCallback(() => {
    if (newUsername && !userFilters.some((f) => f.username === newUsername)) {
      setUserFilters((prev) => [
        ...prev,
        { username: newUsername, enabled: true },
      ]);
      setNewUsername('');
    }
  }, [newUsername, userFilters]);

  const handleToggleUser = useCallback((username: string) => {
    setUserFilters((prev) =>
      prev.map((filter) =>
        filter.username === username
          ? { ...filter, enabled: !filter.enabled }
          : filter,
      ),
    );
  }, []);

  const handleRemoveUser = useCallback((username: string) => {
    setUserFilters((prev) =>
      prev.filter((filter) => filter.username !== username),
    );
  }, []);

  // Load embedded tweets after component mounts
  useEffect(() => {
    // Load Twitter widget script
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <Panel
      title="Trending Tweets"
      icon={<Users className="h-4 w-4" />}
      className="border border-white/[0.08] bg-black/40 backdrop-blur-sm hover:border-white/[0.12] transition-colors"
      onClose={onClose}
      headerContent={
        <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
          <DialogTrigger asChild={true}>
            <button type="button" className="p-1 hover:bg-white/10 rounded">
              <Users className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filter Tweets by User</DialogTitle>
              <DialogDescription>
                Add Twitter usernames to filter the trending tweets
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Twitter username"
                  value={newUsername}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewUsername(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    e.key === 'Enter' && handleAddUser()
                  }
                />
                <Button onClick={handleAddUser}>Add</Button>
              </div>
              <div className="space-y-2">
                {userFilters.map((filter) => (
                  <div
                    key={filter.username}
                    className="flex items-center justify-between bg-white/5 p-2 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={filter.enabled}
                        onChange={() => handleToggleUser(filter.username)}
                        className="rounded border-gray-400"
                      />
                      <span>@{filter.username}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(filter.username)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <ScrollArea className="h-[calc(100%-2rem)] pr-4">
        <div className="space-y-4">
          {sortedTweets.map((tweet) => (
            <div
              key={tweet.id}
              className="border border-white/10 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <img
                  src={tweet.authorAvatar}
                  alt={tweet.authorName}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <div className="font-medium text-white text-xs">
                    {tweet.authorName}
                  </div>
                  <div className="text-xs text-gray-400">
                    @{tweet.authorUsername}
                  </div>
                </div>
              </div>
              <p className="text-white text-xs leading-normal">
                {tweet.content}
              </p>
              <div className="flex gap-4 text-xs text-gray-400">
                <div>❤️ {tweet.metrics.likes.toLocaleString()}</div>
                <div>🔄 {tweet.metrics.retweets.toLocaleString()}</div>
                <div>💬 {tweet.metrics.comments.toLocaleString()}</div>
                <div className="ml-auto text-blue-400">
                  Score: {tweet.engagementScore?.toLocaleString()}
                </div>
              </div>
              <div className="mt-2">
                <blockquote
                  className="twitter-tweet"
                  data-conversation="none"
                  data-theme="dark"
                >
                  <a
                    href={`https://twitter.com/${tweet.authorUsername}/status/${tweet.id}`}
                    aria-label={`View tweet by ${tweet.authorName}`}
                  >
                    View tweet
                  </a>
                </blockquote>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Panel>
  );
}
