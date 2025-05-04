import { elizaLogger } from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';
import type { TwitterConfigService } from '../../../../services/twitter/twitter-config-service';
import type { TwitterService } from '../../../../services/twitter/twitter-service';

interface AccountScore {
  username: string;
  relevanceScore: number;
  qualityScore: number;
  lastUpdated: Date;
  totalTweetsAnalyzed: number;
  relevantTweetsCount: number;
  topicsMatch: Record<string, number>; // Topic -> match count
  interactionScore: number; // Based on RTs, likes, etc.
}

export class TwitterAccountDiscoveryService {
  private readonly twitterService: TwitterService;
  private readonly configService: TwitterConfigService;
  private accountScores: Map<string, AccountScore> = new Map();
  // TODO Should be in config?
  // Thresholds for account management
  private readonly MIN_RELEVANCE_SCORE = 0.6;
  private readonly MIN_QUALITY_SCORE = 0.5;
  private readonly SCORE_DECAY_FACTOR = 0.95; // 5% decay per check
  private readonly MAX_ACCOUNTS = 100; // Maximum number of accounts to track

  constructor(
    twitterService: TwitterService,
    configService: TwitterConfigService,
  ) {
    this.twitterService = twitterService;
    this.configService = configService;
  }

  public async discoverAccountsFromTimeline(
    username: string,
  ): Promise<string[]> {
    try {
      elizaLogger.info(
        `[TwitterAccountDiscoveryService] Discovering accounts from ${username}'s timeline`,
      );

      const timeline = await this.twitterService.getUserTimeline(username, 50);
      const discoveredAccounts = new Set<string>();
      for (const tweet of timeline.tweets) {
        // Add retweeted accounts
        if (tweet.retweetedStatus) {
          discoveredAccounts.add(tweet.retweetedStatus.username);
        }

        // Add quoted accounts
        if (tweet.quotedStatus) {
          discoveredAccounts.add(tweet.quotedStatus.username);
        }

        // Add mentioned accounts
        if (tweet.mentions) {
          for (const mention of tweet.mentions) {
            discoveredAccounts.add(mention.username);
          }
        }
      }

      // Remove the source account from discovered accounts
      discoveredAccounts.delete(username);

      elizaLogger.info(
        `[TwitterAccountDiscoveryService] Discovered ${discoveredAccounts.size} potential accounts from ${username}'s timeline`,
      );

      return Array.from(discoveredAccounts);
    } catch (error) {
      elizaLogger.error(
        `[TwitterAccountDiscoveryService] Error discovering accounts from ${username}'s timeline:`,
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  }

  public async evaluateAccount(username: string): Promise<void> {
    try {
      const timeline = await this.twitterService.getUserTimeline(username, 50);
      if (!timeline.tweets.length) {
        return;
      }

      let relevantTweetsCount = 0;
      let totalQualityScore = 0;
      const topicsMatch: Record<string, number> = {};
      let totalInteractionScore = 0;

      for (const tweet of timeline.tweets) {
        // Calculate tweet quality based on engagement
        const engagementScore =
          (tweet.likes || 0) * 1 +
          (tweet.retweets || 0) * 2 +
          (tweet.replies || 0) * 1.5;

        // Analyze tweet content for relevance
        const analysis = await this.analyzeTweetRelevance(tweet);
        if (analysis.isRelevant) {
          relevantTweetsCount++;
          // Update topic matches
          for (const topic of analysis.matchedTopics) {
            topicsMatch[topic] = (topicsMatch[topic] || 0) + 1;
          }
        }

        totalQualityScore += engagementScore;
        totalInteractionScore += tweet.likes || 0;
      }

      const relevanceScore = relevantTweetsCount / timeline.tweets.length;
      const qualityScore = totalQualityScore / timeline.tweets.length;

      this.updateAccountScore(username, {
        username,
        relevanceScore,
        qualityScore,
        lastUpdated: new Date(),
        totalTweetsAnalyzed: timeline.tweets.length,
        relevantTweetsCount,
        topicsMatch,
        interactionScore: totalInteractionScore / timeline.tweets.length,
      });

      elizaLogger.info(
        `[TwitterAccountDiscoveryService] Evaluated ${username}: relevance=${relevanceScore.toFixed(2)}, quality=${qualityScore.toFixed(2)}`,
      );
    } catch (error) {
      elizaLogger.error(
        `[TwitterAccountDiscoveryService] Error evaluating account ${username}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async analyzeTweetRelevance(tweet: Tweet): Promise<{
    isRelevant: boolean;
    matchedTopics: string[];
  }> {
    // TODO: Implement more sophisticated relevance analysis
    // For now, using a simple keyword match
    const relevantTopics = [
      'blockchain',
      'crypto',
      'web3',
      'defi',
      'nft',
      'dao',
      'ethereum',
      'bitcoin',
      'solana',
      'injective',
    ];

    const matchedTopics = relevantTopics.filter((topic) =>
      tweet.text.toLowerCase().includes(topic.toLowerCase()),
    );

    return {
      isRelevant: matchedTopics.length > 0,
      matchedTopics,
    };
  }

  private updateAccountScore(username: string, newScore: AccountScore): void {
    const existingScore = this.accountScores.get(username);
    if (existingScore) {
      // Apply decay to old scores
      existingScore.relevanceScore *= this.SCORE_DECAY_FACTOR;
      existingScore.qualityScore *= this.SCORE_DECAY_FACTOR;

      // Update with new scores
      this.accountScores.set(username, {
        ...existingScore,
        ...newScore,
        // Weighted average of old and new scores
        relevanceScore:
          (existingScore.relevanceScore + newScore.relevanceScore) / 2,
        qualityScore: (existingScore.qualityScore + newScore.qualityScore) / 2,
      });
    } else {
      this.accountScores.set(username, newScore);
    }
  }

  public async updateTargetAccounts(): Promise<void> {
    try {
      const config = await this.configService.getConfig();
      const currentAccounts = new Set(config.targetAccounts);
      const accountsToRemove = new Set<string>();
      const accountsToAdd = new Set<string>();

      // Check existing accounts for removal
      for (const username of currentAccounts) {
        const score = this.accountScores.get(username);
        if (
          score &&
          (score.relevanceScore < this.MIN_RELEVANCE_SCORE ||
            score.qualityScore < this.MIN_QUALITY_SCORE)
        ) {
          accountsToRemove.add(username);
        }
      }

      // Find new accounts to add
      const sortedAccounts = Array.from(this.accountScores.entries())
        .filter(
          ([username, score]) =>
            !currentAccounts.has(username) &&
            score.relevanceScore >= this.MIN_RELEVANCE_SCORE &&
            score.qualityScore >= this.MIN_QUALITY_SCORE,
        )
        .sort(
          (a, b) =>
            b[1].relevanceScore +
            b[1].qualityScore -
            (a[1].relevanceScore + a[1].qualityScore),
        );

      // Add top accounts up to MAX_ACCOUNTS limit
      const availableSlots =
        this.MAX_ACCOUNTS - (currentAccounts.size - accountsToRemove.size);

      for (const [username] of sortedAccounts.slice(0, availableSlots)) {
        accountsToAdd.add(username);
      }

      if (accountsToRemove.size > 0 || accountsToAdd.size > 0) {
        const updatedAccounts = Array.from(currentAccounts)
          .filter((username) => !accountsToRemove.has(username))
          .concat(Array.from(accountsToAdd));

        await this.configService.updateConfig({
          targetAccounts: updatedAccounts,
        });

        elizaLogger.info(
          `[TwitterAccountDiscoveryService] Updated target accounts: removed ${accountsToRemove.size}, added ${accountsToAdd.size}`,
        );
      }
    } catch (error) {
      elizaLogger.error(
        '[TwitterAccountDiscoveryService] Error updating target accounts:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  public getAccountScores(): Map<string, AccountScore> {
    return this.accountScores;
  }
}
