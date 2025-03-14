import { type IAgentRuntime, elizaLogger } from "@elizaos/core";
import { SearchMode } from "agent-twitter-client";
import { TWITTER_CONFIG } from "../../../config/twitter.js";
import { tweetQueries } from "../../bork-extensions/src/db/queries.js";
import { TwitterAccountsClient } from "./accounts.js";
import { ClientBase } from "./base";
import {
	getUserSpamData,
	processAndStoreTweet,
	updateMarketMetrics,
} from "./lib/utils/tweet-processing.js";

export class TwitterSearchClient extends ClientBase {
	private accountsClient: TwitterAccountsClient;

	constructor(runtime: IAgentRuntime) {
		super(runtime);
		this.accountsClient = new TwitterAccountsClient(runtime);
	}

	async start(): Promise<void> {
		elizaLogger.info("[Twitter Search] Starting search client");
		await this.init();
		await this.accountsClient.start();

		// Initialize topic weights if they don't exist
		await this.initializeTopicWeights();

		this.onReady();
	}

	async stop(): Promise<void> {
		elizaLogger.info("[Twitter Search] Stopping search client");
		await this.accountsClient.stop();
		await super.stop();
	}

	async onReady() {
		this.engageWithSearchTermsLoop();
	}

	private engageWithSearchTermsLoop() {
		this.engageWithSearchTerms();
		const { min, max } = TWITTER_CONFIG.search.searchInterval;
		setTimeout(
			() => this.engageWithSearchTermsLoop(),
			(Math.floor(Math.random() * (max - min + 1)) + min) * 60 * 1000,
		);
	}

	private async engageWithSearchTerms() {
		elizaLogger.info("[Twitter Search] Engaging with search terms");
		try {
			// 1. Get current topic weights from database
			elizaLogger.info("[Twitter Search] Fetching current topic weights");
			const topicWeights = await tweetQueries.getTopicWeights();

			if (!topicWeights.length) {
				elizaLogger.warn(
					"[Twitter Search] No topic weights found, reinitializing",
				);
				await this.initializeTopicWeights();
				return;
			}

			// Sort topics by weight and select one with probability proportional to weight
			const totalWeight = topicWeights.reduce((sum, tw) => sum + tw.weight, 0);
			const randomValue = Math.random() * totalWeight;
			let accumWeight = 0;
			const selectedTopic =
				topicWeights.find((tw) => {
					accumWeight += tw.weight;
					return randomValue <= accumWeight;
				}) || topicWeights[0];

			elizaLogger.info(
				"[Twitter Search] Selected search term based on weights",
				{
					selectedTopic: selectedTopic.topic,
					weight: selectedTopic.weight,
					allWeights: topicWeights.map((tw) => ({
						topic: tw.topic,
						weight: tw.weight,
					})),
				},
			);

			elizaLogger.info("[Twitter Search] Fetching search tweets");
			await new Promise((resolve) => setTimeout(resolve, 5000));

			// Directly fetch search tweets without retry logic
			const recentTweets = await this.fetchSearchTweets(
				selectedTopic.topic,
				TWITTER_CONFIG.search.tweetLimits.searchResults,
				SearchMode.Top,
			);

			if (!recentTweets?.tweets || recentTweets.tweets.length === 0) {
				elizaLogger.warn(
					`[Twitter Search] No tweets found for term: ${selectedTopic.topic}`,
				);
				return;
			}

			elizaLogger.info(
				`[Twitter Search] Found ${recentTweets.tweets.length} tweets for term: ${selectedTopic.topic}`,
			);

			// Map tweets to our format
			const allTweets = recentTweets.tweets.map((tweet) => ({
				...tweet,
				created_at: new Date(tweet.timestamp * 1000),
				author_id: tweet.userId,
				text: tweet.text || "",
				public_metrics: {
					like_count: tweet.likes || 0,
					retweet_count: tweet.retweets || 0,
					reply_count: tweet.replies || 0,
				},
				entities: {
					hashtags: tweet.hashtags || [],
					mentions: tweet.mentions || [],
					urls: tweet.urls || [],
				},
			}));

			// Get spam data for all unique authors
			const uniqueAuthors = [...new Set(allTweets.map((t) => t.author_id))];
			elizaLogger.info(
				`[Twitter Search] Fetching spam data for ${uniqueAuthors.length} unique authors`,
			);

			const spamUsers = new Set<string>();
			await Promise.all(
				uniqueAuthors.map(async (authorId) => {
					try {
						const spamData = await getUserSpamData(
							authorId,
							"[Twitter Search]",
						);
						if (spamData && spamData.spamScore > 0.7) {
							spamUsers.add(authorId);
							elizaLogger.debug(
								`[Twitter Search] Filtered out spam user ${authorId}`,
								{
									spamScore: spamData.spamScore,
									tweetCount: spamData.tweetCount,
									violations: spamData.violations,
								},
							);
						}
					} catch (error) {
						elizaLogger.error(
							`[Twitter Search] Error fetching spam data for user ${authorId}:`,
							error,
						);
					}
				}),
			);

			// Filter out tweets from known spam users
			const filteredTweets = allTweets.filter(
				(tweet) => !spamUsers.has(tweet.author_id),
			);
			const spammedTweets = allTweets.length - filteredTweets.length;

			elizaLogger.info(
				`[Twitter Search] Filtered ${spammedTweets} tweets from ${spamUsers.size} spam users. Processing ${filteredTweets.length} tweets`,
				{
					totalTweets: allTweets.length,
					spammedTweets,
					spamUsers: spamUsers.size,
					remainingTweets: filteredTweets.length,
				},
			);

			if (filteredTweets.length > 0) {
				for (const tweet of filteredTweets) {
					await processAndStoreTweet(
						this,
						tweet,
						topicWeights,
						"[Twitter Search]",
					);
				}

				// Update market metrics with non-spam tweets
				await updateMarketMetrics(filteredTweets, "[Twitter Search]");
			} else {
				elizaLogger.warn(
					"[Twitter Search] No non-spam tweets found to process",
				);
			}

			elizaLogger.info(
				"[Twitter Search] Successfully processed search results",
			);
		} catch (error) {
			elizaLogger.error(
				"[Twitter Search] Error engaging with search terms:",
				error,
			);
		}
	}

	private async initializeTopicWeights(): Promise<void> {
		try {
			elizaLogger.info("[Twitter Search] Initializing topic weights");
			await tweetQueries.initializeTopicWeights(this.runtime.character.topics);
			elizaLogger.info("[Twitter Search] Topic weights initialized");
		} catch (error) {
			elizaLogger.error(
				"[Twitter Search] Error initializing topic weights:",
				error,
			);
		}
	}
}

export default TwitterSearchClient;
