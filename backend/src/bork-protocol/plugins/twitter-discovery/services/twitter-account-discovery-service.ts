import { TwitterService } from '@/services/twitter-service';
import { TwitterDiscoveryConfigService } from '@bork/plugins/twitter-discovery/services/twitter-discovery-config-service';
import type { AccountScore } from '@bork/plugins/twitter-discovery/types/account-score';
import { ServiceTypeExtension } from '@bork/plugins/twitter-discovery/types/service-type-extension';
import {
  type IAgentRuntime,
  Service,
  type ServiceType,
  elizaLogger,
} from '@elizaos/core';
import type { Tweet } from 'agent-twitter-client';

export class TwitterAccountDiscoveryService extends Service {
  private accountScores: Map<string, AccountScore> = new Map();
  private twitterService: TwitterService;
  private configService: TwitterDiscoveryConfigService;
  private scoreDecayFactor: number;
  private minRelevanceScore: number;
  private minQualityScore: number;
  private maxAccounts: number;

  static get serviceType(): ServiceType {
    return ServiceTypeExtension.ACCOUNT_DISCOVERY as unknown as ServiceType;
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    elizaLogger.info(
      '[TwitterAccountDiscoveryService] Initializing account discovery service',
    );
    const configService = runtime.services.get(
      TwitterDiscoveryConfigService.serviceType,
    ) as TwitterDiscoveryConfigService;
    if (!configService) {
      elizaLogger.error(
        '[TwitterAccountDiscoveryService] Twitter config service not found',
      );
      return;
    }
    this.scoreDecayFactor = configService.getCharacterConfig().scoreDecayFactor;
    this.minRelevanceScore =
      configService.getCharacterConfig().minRelevanceScore;
    this.minQualityScore = configService.getCharacterConfig().minQualityScore;
    this.maxAccounts = configService.getCharacterConfig().maxAccounts;
    this.configService = configService;

    const twitterService = runtime.services.get(
      TwitterService.serviceType,
    ) as TwitterService;
    if (!twitterService) {
      elizaLogger.error(
        '[TwitterAccountDiscoveryService] Twitter service not found',
      );
      return;
    }
    this.twitterService = twitterService;
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
      existingScore.relevanceScore *= this.scoreDecayFactor;
      existingScore.qualityScore *= this.scoreDecayFactor;

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
          (score.relevanceScore < this.minRelevanceScore ||
            score.qualityScore < this.minQualityScore)
        ) {
          accountsToRemove.add(username);
        }
      }

      // Find new accounts to add
      const sortedAccounts = Array.from(this.accountScores.entries())
        .filter(
          ([username, score]) =>
            !currentAccounts.has(username) &&
            score.relevanceScore >= this.minRelevanceScore &&
            score.qualityScore >= this.minQualityScore,
        )
        .sort(
          (a, b) =>
            b[1].relevanceScore +
            b[1].qualityScore -
            (a[1].relevanceScore + a[1].qualityScore),
        );

      // Add top accounts up to MAX_ACCOUNTS limit
      const availableSlots =
        this.maxAccounts - (currentAccounts.size - accountsToRemove.size);

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

export const twitterAccountDiscoveryService =
  new TwitterAccountDiscoveryService();
