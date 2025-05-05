export interface MediaItem {
  id?: string;
  url: string;
  preview?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export type TweetMediaItem = string | MediaItem;
