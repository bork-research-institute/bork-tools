export interface TweetMedia {
  id: string;
  url: string;
  preview?: string;
}

export type TweetMediaItem = string | TweetMedia;
