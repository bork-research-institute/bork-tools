import type { Tweet } from 'agent-twitter-client';

// Crypto-related tweets
export const mockCryptoTweets: Tweet[] = [
  {
    bookmarkCount: 0,
    conversationId: '1906664825826001028',
    hashtags: [],
    html: '<a href="https://twitter.com/Favouritedotsui">@Favouritedotsui</a> <a href="https://twitter.com/WalrusProtocol">@WalrusProtocol</a> <a href="https://twitter.com/SuiNetwork">@SuiNetwork</a> <a href="https://twitter.com/SuiFoundation">@SuiFoundation</a> <a href="https://twitter.com/SuiFamOfficial">@SuiFamOfficial</a> 1 <a href="https://twitter.com/search?q=%24WAL">$WAL</a> = 1 <a href="https://twitter.com/search?q=%24APT">$APT</a>',
    id: '1906665176255885582',
    inReplyToStatus: undefined,
    inReplyToStatusId: '1906664825826001028',
    isQuoted: false,
    isPin: false,
    isReply: true,
    isRetweet: false,
    isSelfThread: false,
    likes: 11,
    name: 'matteodotsui',
    mentions: [
      { username: 'Favouritedotsui', id: '' },
      { username: 'WalrusProtocol', id: '' },
      { username: 'SuiNetwork', id: '' },
      { username: 'SuiFoundation', id: '' },
      { username: 'SuiFamOfficial', id: '' },
    ],
    permanentUrl: 'https://twitter.com/username/status/1906665176255885582',
    photos: [],
    place: undefined,
    quotedStatus: undefined,
    quotedStatusId: undefined,
    replies: 3,
    retweets: 1,
    retweetedStatus: undefined,
    retweetedStatusId: undefined,
    text: '@Favouritedotsui @WalrusProtocol @SuiNetwork @SuiFoundation @SuiFamOfficial 1 $WAL = 1 $APT',
    thread: [],
    timeParsed: new Date(),
    timestamp: Date.now(),
    urls: [],
    userId: 'test-user-1',
    username: 'matteodotsui',
    videos: [],
    views: 1000,
    sensitiveContent: false,
    poll: null,
  },
];

// Combined mock tweets for testing
export const mockTweets: Tweet[] = [...mockCryptoTweets];
