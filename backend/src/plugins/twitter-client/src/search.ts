import {
	composeContext,
	elizaLogger,
	generateMessageResponse,
} from "@elizaos/core";
import { stringToUuid } from "@elizaos/core";
import { ModelClass } from "@elizaos/core";
import { SearchMode } from "agent-twitter-client";
import { v4 as uuidv4 } from "uuid";
import { TWITTER_CONFIG } from "../../../config/twitter.js";
import { tweetQueries } from "../../bork-extensions/src/db/queries.js";
import { ClientBase } from "./base";
import type { MarketMetrics, SpamUser, Tweet } from "./lib/twitter.js";
import type { TopicWeightRow, TweetAnalysis } from "./lib/types.js";
import { convertToTopicWeight } from "./lib/types.js";
import { tweetAnalysisTemplate } from "./templates/analysis.js";

export class TwitterSearchClient extends ClientBase {
	async start(): Promise<void> {
		elizaLogger.info("[Twitter Search] Starting search client");
		await this.init();

		// Initialize topic weights if they don't exist
		await this.initializeTopicWeights();

		this.onReady();
	}

	async stop(): Promise<void> {
		elizaLogger.info("[Twitter Search] Stopping search client");
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

			// 2. Fetch tweets from target accounts
			elizaLogger.info(
				"[Twitter Search] Starting to fetch target account tweets",
			);
			const targetTweets = await this.fetchTargetAccountTweets();
			elizaLogger.info(
				`[Twitter Search] Fetched ${targetTweets.length} tweets from target accounts`,
			);

			// 3. Fetch tweets from influencers
			elizaLogger.info("[Twitter Search] Starting to fetch influencer tweets");
			const influencerTweets = await this.fetchInfluencerTweets();
			elizaLogger.info(
				`[Twitter Search] Fetched ${influencerTweets.length} tweets from influencers`,
			);

			// 4. Combine all tweets and map to our format
			const allTweets = [
				...recentTweets.tweets.map((tweet) => ({
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
				})),
				...targetTweets,
				...influencerTweets,
			];

			// 5. Get spam data for all unique authors
			const uniqueAuthors = [...new Set(allTweets.map((t) => t.author_id))];
			elizaLogger.info(
				`[Twitter Search] Fetching spam data for ${uniqueAuthors.length} unique authors`,
			);

			const spamUsers = new Set<string>();
			await Promise.all(
				uniqueAuthors.map(async (authorId) => {
					try {
						const spamData = await this.getUserSpamData(authorId);
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

			// 6. Filter out tweets from known spam users
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
					await this.processAndStoreTweet(tweet, topicWeights);
				}

				// 7. Update market metrics with non-spam tweets
				await this.updateMarketMetrics(filteredTweets);
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

	private async fetchTargetAccountTweets() {
		const tweets: Tweet[] = [];
		for (const account of TWITTER_CONFIG.targetAccounts) {
			try {
				const userTweets = await this.fetchSearchTweets(
					`from:${account}`,
					TWITTER_CONFIG.search.tweetLimits.targetAccounts,
					SearchMode.Latest,
				);
				if (userTweets?.tweets) {
					tweets.push(
						...userTweets.tweets.map((tweet) => ({
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
						})),
					);
				}
			} catch (error) {
				elizaLogger.error(
					`[Twitter Search] Error fetching tweets from ${account}:`,
					error,
				);
			}
		}
		return tweets;
	}

	private async fetchInfluencerTweets() {
		const tweets: Tweet[] = [];
		for (const account of TWITTER_CONFIG.influencerAccounts) {
			try {
				const userTweets = await this.fetchSearchTweets(
					`from:${account}`,
					TWITTER_CONFIG.search.tweetLimits.influencerAccounts,
					SearchMode.Latest,
				);
				if (userTweets?.tweets) {
					tweets.push(
						...userTweets.tweets.map((tweet) => ({
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
						})),
					);
				}
			} catch (error) {
				elizaLogger.error(
					`[Twitter Search] Error fetching tweets from ${account}:`,
					error,
				);
			}
		}
		return tweets;
	}

	private extractJsonFromText(text: string): string {
		try {
			// First try direct parsing after aggressive trimming
			const trimmedText = text.trim().replace(/^\s+|\s+$/g, "");
			JSON.parse(trimmedText);
			return trimmedText;
		} catch {
			// If direct parsing fails, try to extract JSON object
			const jsonMatch = text.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const extractedJson = jsonMatch[0]
					.replace(/^\s+|\s+$/g, "") // Remove all leading/trailing whitespace
					.replace(/\s+/g, " ") // Normalize internal spaces
					.replace(/\{\s+/, "{") // Remove spaces after opening brace
					.replace(/\s+\}/, "}") // Remove spaces before closing brace
					.replace(/\[\s+/, "[") // Remove spaces after opening bracket
					.replace(/\s+\]/, "]") // Remove spaces before closing bracket
					.replace(/,\s+/, ",") // Remove spaces after commas
					.replace(/:\s+/, ":") // Remove spaces after colons
					.trim();

				try {
					// Validate the extracted JSON
					JSON.parse(extractedJson);
					return extractedJson;
				} catch {
					// If extraction fails, try to clean up common issues
					const cleanedJson = extractedJson
						.replace(/^\s+/, "") // Remove leading whitespace
						.replace(/\s+$/, "") // Remove trailing whitespace
						.replace(/\n\s*/g, " ") // Replace newlines with spaces
						.replace(/\s+/g, " ") // Normalize spaces
						.replace(/\{\s+/, "{") // Remove spaces after opening brace
						.replace(/\s+\}/, "}") // Remove spaces before closing brace
						.replace(/\[\s+/, "[") // Remove spaces after opening bracket
						.replace(/\s+\]/, "]") // Remove spaces before closing bracket
						.replace(/,\s+/, ",") // Remove spaces after commas
						.replace(/:\s+/, ":") // Remove spaces after colons
						.trim();

					try {
						JSON.parse(cleanedJson);
						return cleanedJson;
					} catch {
						// If all else fails, return a default valid JSON
						return JSON.stringify({
							spamAnalysis: {
								spamScore: 0.5,
								reasons: [],
								isSpam: false,
							},
							contentAnalysis: {
								type: "unknown",
								sentiment: "neutral",
								confidence: 0.5,
								impactScore: 0.5,
								entities: [],
								topics: [],
								metrics: {},
							},
						});
					}
				}
			}
			// If no JSON found, return default
			return JSON.stringify({
				spamAnalysis: {
					spamScore: 0.5,
					reasons: [],
					isSpam: false,
				},
				contentAnalysis: {
					type: "unknown",
					sentiment: "neutral",
					confidence: 0.5,
					impactScore: 0.5,
					entities: [],
					topics: [],
					metrics: {},
				},
			});
		}
	}

	private async processAndStoreTweet(
		tweet: Tweet,
		topicWeights: TopicWeightRow[],
	): Promise<void> {
		let analysis: { text: string } | TweetAnalysis | undefined;
		try {
			elizaLogger.info(
				`[Twitter Search] Starting analysis for tweet ${tweet.id} from @${tweet.author_id}`,
				{
					text:
						tweet.text.substring(0, 100) +
						(tweet.text.length > 100 ? "..." : ""),
					metrics: tweet.public_metrics,
				},
			);

			// Perform comprehensive analysis with retry logic
			elizaLogger.debug("[Twitter Search] Starting comprehensive analysis");
			let retryCount = 0;
			const maxRetries = 3;
			const baseDelay = 2000; // 2 seconds

			while (retryCount < maxRetries) {
				try {
					const template = tweetAnalysisTemplate({
						text: tweet.text,
						public_metrics: {
							like_count: tweet.public_metrics?.like_count || 0,
							retweet_count: tweet.public_metrics?.retweet_count || 0,
							reply_count: tweet.public_metrics?.reply_count || 0,
						},
						topics: this.runtime.character.topics,
						topicWeights: topicWeights.map(convertToTopicWeight),
					});

					const tweetId = stringToUuid(`${tweet.id}-${this.runtime.agentId}`);
					const tweetExists =
						await this.runtime.messageManager.getMemoryById(tweetId);

					if (!tweetExists) {
						elizaLogger.info(
							`[Twitter Search] Tweet ${tweet.id} does not exist, saving`,
						);
						const userIdUUID = stringToUuid(tweet.author_id);
						const roomId = stringToUuid(
							`${tweet.conversationId}-${this.runtime.agentId}`,
						);

						// Save tweet directly to tweets table with a new UUID
						await tweetQueries.saveTweetObject({
							id: uuidv4(), // Generate a new UUID for the tweet
							content: tweet.text,
							status: "analyzed",
							createdAt: tweet.created_at,
							agentId: this.runtime.agentId,
							mediaType: "text",
							mediaUrl: tweet.permanentUrl,
							homeTimeline: {
								publicMetrics: tweet.public_metrics || {},
								entities: tweet.entities || {},
								twitterTweetId: tweet.id, // Store the original Twitter tweet ID
							},
						});

						const message = {
							content: { text: tweet.text },
							agentId: this.runtime.agentId,
							userId: userIdUUID,
							roomId,
						};

						const context = composeContext({
							state: await this.runtime.composeState(message, {
								twitterClient: this.twitterClient,
								twitterUserName: this.runtime.getSetting("TWITTER_USERNAME"),
								currentPost: tweet.text,
								formattedConversation: tweet.text,
								timeline: tweet.text,
							}),
							template: template.context,
						});

						elizaLogger.debug("[Twitter Search] Generated context:", {
							contextLength: context.length,
							hasTemplate: Boolean(template.context),
							modelClass: template.modelClass,
						});

						analysis = await generateMessageResponse({
							runtime: this.runtime,
							context,
							modelClass: ModelClass.LARGE,
						});

						// Validate the analysis response
						if (!analysis || typeof analysis !== "object") {
							elizaLogger.error("[Twitter Search] Invalid analysis response:", {
								analysis,
								contextLength: context.length,
								modelClass: template.modelClass,
							});
							throw new Error("Invalid analysis response structure");
						}

						// If the response is already a JSON object, use it directly
						let cleanedText: string;
						if (typeof analysis === "object" && "spamAnalysis" in analysis) {
							cleanedText = JSON.stringify(analysis);
						} else if (typeof analysis === "object" && "text" in analysis) {
							const textAnalysis = analysis as { text: string };
							cleanedText = this.extractJsonFromText(textAnalysis.text);
						} else {
							throw new Error("Invalid analysis response format");
						}

						elizaLogger.debug("[Twitter Search] Cleaned analysis text:", {
							cleanedText,
							cleanedLength: cleanedText.length,
						});

						const parsedAnalysis = JSON.parse(cleanedText);
						elizaLogger.debug("[Twitter Search] Parsed analysis:", {
							hasSpamAnalysis: !!parsedAnalysis.spamAnalysis,
							hasContentAnalysis: !!parsedAnalysis.contentAnalysis,
							spamScore: parsedAnalysis.spamAnalysis?.spamScore,
							type: parsedAnalysis.contentAnalysis?.type,
						});

						// Validate required fields
						if (
							!parsedAnalysis.spamAnalysis ||
							!parsedAnalysis.contentAnalysis
						) {
							throw new Error(
								"Invalid analysis format - missing required fields",
							);
						}

						break;
					}

					const message = {
						content: { text: tweet.text },
						agentId: this.runtime.agentId,
						userId: stringToUuid(tweet.author_id),
						roomId: stringToUuid(
							`${tweet.conversationId}-${this.runtime.agentId}`,
						),
					};

					const context = composeContext({
						state: await this.runtime.composeState(message, {
							twitterClient: this.twitterClient,
							twitterUserName: this.runtime.getSetting("TWITTER_USERNAME"),
							currentPost: tweet.text,
							formattedConversation: tweet.text,
							timeline: tweet.text,
						}),
						template: template.context,
					});

					elizaLogger.debug("[Twitter Search] Generated context:", {
						contextLength: context.length,
						hasTemplate: Boolean(template.context),
						modelClass: template.modelClass,
					});

					analysis = await generateMessageResponse({
						runtime: this.runtime,
						context,
						modelClass: ModelClass.LARGE,
					});

					// Validate the analysis response
					if (!analysis || typeof analysis !== "object") {
						elizaLogger.error("[Twitter Search] Invalid analysis response:", {
							analysis,
							contextLength: context.length,
							modelClass: template.modelClass,
						});
						throw new Error("Invalid analysis response structure");
					}

					// If the response is already a JSON object, use it directly
					let cleanedText: string;
					if (typeof analysis === "object" && "spamAnalysis" in analysis) {
						cleanedText = JSON.stringify(analysis);
					} else if (typeof analysis === "object" && "text" in analysis) {
						const textAnalysis = analysis as { text: string };
						cleanedText = this.extractJsonFromText(textAnalysis.text);
					} else {
						throw new Error("Invalid analysis response format");
					}

					elizaLogger.debug("[Twitter Search] Cleaned analysis text:", {
						cleanedText,
						cleanedLength: cleanedText.length,
					});

					const parsedAnalysis = JSON.parse(cleanedText);
					elizaLogger.debug("[Twitter Search] Parsed analysis:", {
						hasSpamAnalysis: !!parsedAnalysis.spamAnalysis,
						hasContentAnalysis: !!parsedAnalysis.contentAnalysis,
						spamScore: parsedAnalysis.spamAnalysis?.spamScore,
						type: parsedAnalysis.contentAnalysis?.type,
					});

					// Validate required fields
					if (!parsedAnalysis.spamAnalysis || !parsedAnalysis.contentAnalysis) {
						throw new Error(
							"Invalid analysis format - missing required fields",
						);
					}

					break;
				} catch (error) {
					retryCount++;
					elizaLogger.error("[Twitter Search] Analysis error details:", {
						error: error.message,
						stack: error.stack,
						rawResponse:
							typeof analysis === "object" && "text" in analysis
								? (analysis as { text: string }).text
								: "No response received",
						attempt: retryCount,
						maxRetries,
					});
					if (error.message?.includes("rate_limit_exceeded")) {
						const delay = baseDelay * 2 ** retryCount; // Using ** operator
						elizaLogger.warn(
							`[Twitter Search] Rate limit hit, retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`,
						);
						await new Promise((resolve) => setTimeout(resolve, delay));
					} else if (retryCount === maxRetries) {
						throw error;
					} else {
						elizaLogger.warn(
							`[Twitter Search] Analysis failed, retrying (attempt ${retryCount}/${maxRetries})`,
							error,
						);
						await new Promise((resolve) => setTimeout(resolve, baseDelay));
					}
				}
			}

			if (!analysis) {
				throw new Error("Failed to generate analysis after max retries");
			}

			// Parse the analysis response if it's not already an object
			let parsedAnalysis: TweetAnalysis;
			if (typeof analysis === "object" && "spamAnalysis" in analysis) {
				parsedAnalysis = analysis as TweetAnalysis;
			} else if (typeof analysis === "object" && "text" in analysis) {
				const textAnalysis = analysis as { text: string };
				const cleanedText = this.extractJsonFromText(textAnalysis.text);
				parsedAnalysis = JSON.parse(cleanedText);
			} else {
				throw new Error("Invalid analysis response format");
			}

			const { spamAnalysis, contentAnalysis } = parsedAnalysis;

			elizaLogger.info("[Twitter Search] Analysis results", {
				tweetId: tweet.id,
				isSpam: spamAnalysis.isSpam,
				spamScore: spamAnalysis.spamScore,
				spamReasons: spamAnalysis.reasons,
				type: contentAnalysis.type,
				sentiment: contentAnalysis.sentiment,
				confidence: contentAnalysis.confidence,
				impactScore: contentAnalysis.impactScore,
				relevantTopics: contentAnalysis.topics,
			});

			// Update spam user data
			elizaLogger.debug(
				`[Twitter Search] Updating spam data for user ${tweet.author_id}`,
				{
					spamScore: spamAnalysis.spamScore,
					violationCount: spamAnalysis.reasons.length,
				},
			);
			await this.updateUserSpamData(
				tweet.author_id,
				spamAnalysis.spamScore,
				spamAnalysis.reasons,
			);

			// Update topic weights based on analysis
			if (!spamAnalysis.isSpam) {
				const relevantTopics = contentAnalysis.topics || [];
				const impactScore = contentAnalysis.impactScore || 0.5;
				await this.updateTopicWeights(
					topicWeights,
					relevantTopics,
					impactScore,
				);
			}

			// Store analysis in database
			const tweetId = uuidv4(); // Generate a new UUID for the analysis
			await tweetQueries.insertTweetAnalysis(
				tweetId,
				parsedAnalysis.spamAnalysis.isSpam
					? "engagement"
					: parsedAnalysis.contentAnalysis.type,
				parsedAnalysis.spamAnalysis.isSpam
					? "neutral"
					: parsedAnalysis.contentAnalysis.sentiment,
				parsedAnalysis.spamAnalysis.isSpam
					? 0.1
					: parsedAnalysis.contentAnalysis.confidence,
				{
					likes: tweet.public_metrics?.like_count || 0,
					retweets: tweet.public_metrics?.retweet_count || 0,
					replies: tweet.public_metrics?.reply_count || 0,
					spamScore: parsedAnalysis.spamAnalysis.spamScore,
					spamViolations: parsedAnalysis.spamAnalysis.reasons,
					...(parsedAnalysis.spamAnalysis.isSpam
						? {}
						: parsedAnalysis.contentAnalysis.metrics),
				},
				parsedAnalysis.spamAnalysis.isSpam
					? []
					: parsedAnalysis.contentAnalysis.entities,
				parsedAnalysis.spamAnalysis.isSpam
					? []
					: parsedAnalysis.contentAnalysis.topics,
				parsedAnalysis.spamAnalysis.isSpam
					? 0.1
					: parsedAnalysis.contentAnalysis.impactScore,
				tweet.created_at,
				tweet.author_id,
				tweet.text,
				tweet.public_metrics || {},
				{
					...tweet.entities,
					topicWeights: topicWeights.map(convertToTopicWeight),
				},
			);

			elizaLogger.info(
				`[Twitter Search] Successfully processed tweet ${tweet.id}`,
				{
					type: parsedAnalysis.spamAnalysis.isSpam ? "spam" : "content",
					author: tweet.author_id,
					analysisType: parsedAnalysis.spamAnalysis.isSpam
						? "engagement"
						: parsedAnalysis.contentAnalysis.type,
					sentiment: parsedAnalysis.spamAnalysis.isSpam
						? "neutral"
						: parsedAnalysis.contentAnalysis.sentiment,
					topicCount: parsedAnalysis.spamAnalysis.isSpam
						? 0
						: parsedAnalysis.contentAnalysis.topics.length,
					entityCount: parsedAnalysis.spamAnalysis.isSpam
						? 0
						: parsedAnalysis.contentAnalysis.entities.length,
				},
			);
		} catch (error) {
			elizaLogger.error("[Twitter Search] Error processing tweet:", {
				error: error.message,
				stack: error.stack,
				tweetId: tweet.id,
				authorId: tweet.author_id,
				text:
					tweet.text.substring(0, 100) + (tweet.text.length > 100 ? "..." : ""),
				metrics: tweet.public_metrics,
				analysis: analysis
					? {
							isObject: typeof analysis === "object",
							hasSpamAnalysis:
								typeof analysis === "object" && "spamAnalysis" in analysis,
							hasText: typeof analysis === "object" && "text" in analysis,
							objectKeys: Object.keys(analysis),
						}
					: null,
			});
		}
	}

	private async updateTopicWeights(
		currentWeights: TopicWeightRow[],
		relevantTopics: string[],
		impactScore: number,
	): Promise<TopicWeightRow[]> {
		try {
			// Update weights based on relevance and impact
			const updatedWeights = currentWeights.map((weight) => {
				const isRelevant = relevantTopics.includes(weight.topic);
				const newWeight = isRelevant
					? Math.min(1, weight.weight + 0.1 * impactScore)
					: Math.max(0, weight.weight - 0.05);

				return {
					...weight,
					weight: newWeight,
					impact_score: isRelevant ? impactScore : weight.impact_score,
					last_updated: new Date(),
				};
			});

			// Store updated weights in database
			await Promise.all(
				updatedWeights.map(({ topic, weight, impact_score, seed_weight }) =>
					tweetQueries.updateTopicWeight(
						topic,
						weight,
						impact_score,
						seed_weight,
					),
				),
			);

			return updatedWeights;
		} catch (error) {
			elizaLogger.error(
				"[Twitter Search] Error updating topic weights:",
				error,
			);
			return currentWeights;
		}
	}

	private async getUserSpamData(userId: string): Promise<SpamUser | null> {
		try {
			const spamUser = await tweetQueries.getSpamUser(userId);
			if (!spamUser) {
				return null;
			}

			return {
				userId: spamUser.user_id,
				spamScore: spamUser.spam_score,
				lastTweetDate: new Date(spamUser.last_tweet_date),
				tweetCount: spamUser.tweet_count,
				violations: spamUser.violations,
			};
		} catch (error) {
			elizaLogger.error(
				`[Twitter Search] Error getting spam data for user ${userId}:`,
				error,
			);
			return null;
		}
	}

	private async updateUserSpamData(
		userId: string,
		spamScore: number,
		violations: string[],
	): Promise<void> {
		try {
			await tweetQueries.updateSpamUser(userId, spamScore, violations);
			elizaLogger.info(`[Twitter Search] Updated spam data for user ${userId}`);
		} catch (error) {
			elizaLogger.error(
				`[Twitter Search] Error updating spam data for user ${userId}:`,
				error,
			);
		}
	}

	private async updateMarketMetrics(tweets: Tweet[]) {
		try {
			// Calculate aggregate metrics
			const metrics: MarketMetrics = {
				totalEngagement: tweets.reduce(
					(sum, tweet) =>
						sum +
						(tweet.public_metrics?.like_count || 0) +
						(tweet.public_metrics?.retweet_count || 0) +
						(tweet.public_metrics?.reply_count || 0),
					0,
				),
				tweetCount: tweets.length,
				averageSentiment: 0.5, // TODO: Calculate from analysis
				timestamp: new Date(),
			};

			// Store in database
			await tweetQueries.insertMarketMetrics({
				...metrics,
				[metrics.timestamp.toISOString()]: metrics,
			});

			elizaLogger.info("[Twitter Search] Updated market metrics");
		} catch (error) {
			elizaLogger.error(
				"[Twitter Search] Error updating market metrics:",
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
