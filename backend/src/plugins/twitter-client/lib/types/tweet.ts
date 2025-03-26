export interface Tweet {
  id: string;
  text: string;
  userId: string;
  name: string;
  username: string;
  timestamp: number;
  likes: number;
  retweets: number;
  replies: number;
  thread?: Tweet[];
  topReplies?: {
    id: string;
    text: string;
    username: string;
    timestamp: number;
  }[];
}
