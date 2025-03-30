import { elizaLogger } from '@elizaos/core';
import type { TweetAnalysis } from '../types/analysis';
import {} from '../utils/text-processing';

/**
 * Creates a default TweetAnalysis object with reasonable default values
 * Used as a fallback when the AI response is malformed
 */
export function createDefaultAnalysis(): TweetAnalysis {
  return {
    contentAnalysis: {
      type: 'other',
      format: 'statement',
      sentiment: 'neutral',
      confidence: 0.5,
      primaryTopics: [],
      secondaryTopics: [],
      entities: {
        people: [],
        organizations: [],
        products: [],
        locations: [],
        events: [],
      },
      hashtagsUsed: [],
      qualityMetrics: {
        relevance: 0.5,
        originality: 0.5,
        clarity: 0.5,
        authenticity: 0.5,
        valueAdd: 0.5,
      },
      engagementAnalysis: {
        overallScore: 0.5,
        virality: 0.5,
        conversionPotential: 0.5,
        communityBuilding: 0.5,
        thoughtLeadership: 0.5,
      },
    },
    spamAnalysis: {
      isSpam: false,
      spamScore: 0.1,
      reasons: [],
      confidenceMetrics: {
        linguisticRisk: 0.1,
        topicMismatch: 0.1,
        engagementAnomaly: 0.1,
        promotionalIntent: 0.1,
        accountTrustSignals: 0.1,
      },
    },
    marketingInsights: {
      targetAudience: [],
      keyTakeaways: [],
      contentStrategies: {
        whatWorked: [],
        improvement: [],
      },
      trendAlignment: {
        currentTrends: [],
        emergingOpportunities: [],
        relevanceScore: 0.5,
      },
      copywriting: {
        effectiveElements: [],
        hooks: [],
        callToAction: {
          present: false,
          type: 'none',
          effectiveness: 0.5,
        },
      },
    },
    actionableRecommendations: {
      engagementStrategies: [
        {
          action: 'Monitor engagement',
          rationale: 'Initial analysis required',
          priority: 'medium',
          expectedOutcome: 'Baseline metrics established',
        },
      ],
      contentCreation: [
        {
          contentType: 'general',
          focus: 'content quality',
          keyElements: ['clarity', 'value'],
        },
      ],
      networkBuilding: [
        {
          targetType: 'community',
          target: 'general audience',
          approach: 'organic growth',
          value: 'establish presence',
        },
      ],
    },
  };
}

/**
 * Repairs a partially formed analysis response by filling in missing data
 * with reasonable defaults
 */
export function repairAnalysisResponse(
  partialAnalysis: Partial<Record<string, unknown>>,
): TweetAnalysis {
  const defaultAnalysis = createDefaultAnalysis();
  const result: TweetAnalysis = { ...defaultAnalysis };

  // Handle content analysis
  if ('contentAnalysis' in partialAnalysis && partialAnalysis.contentAnalysis) {
    const partialContent = partialAnalysis.contentAnalysis as Record<
      string,
      unknown
    >;
    result.contentAnalysis = {
      type:
        (partialContent.type as string) || defaultAnalysis.contentAnalysis.type,
      format:
        (partialContent.format as string) ||
        defaultAnalysis.contentAnalysis.format,
      sentiment:
        (partialContent.sentiment as string) ||
        defaultAnalysis.contentAnalysis.sentiment,
      confidence:
        (partialContent.confidence as number) ||
        defaultAnalysis.contentAnalysis.confidence,
      primaryTopics: Array.isArray(partialContent.primaryTopics)
        ? partialContent.primaryTopics
        : defaultAnalysis.contentAnalysis.primaryTopics,
      secondaryTopics: Array.isArray(partialContent.secondaryTopics)
        ? partialContent.secondaryTopics
        : defaultAnalysis.contentAnalysis.secondaryTopics,
      entities: {
        people: Array.isArray(
          (partialContent.entities as Record<string, unknown>)?.people,
        )
          ? ((partialContent.entities as Record<string, unknown>)
              ?.people as string[])
          : defaultAnalysis.contentAnalysis.entities.people,
        organizations: Array.isArray(
          (partialContent.entities as Record<string, unknown>)?.organizations,
        )
          ? ((partialContent.entities as Record<string, unknown>)
              ?.organizations as string[])
          : defaultAnalysis.contentAnalysis.entities.organizations,
        products: Array.isArray(
          (partialContent.entities as Record<string, unknown>)?.products,
        )
          ? ((partialContent.entities as Record<string, unknown>)
              ?.products as string[])
          : defaultAnalysis.contentAnalysis.entities.products,
        locations: Array.isArray(
          (partialContent.entities as Record<string, unknown>)?.locations,
        )
          ? ((partialContent.entities as Record<string, unknown>)
              ?.locations as string[])
          : defaultAnalysis.contentAnalysis.entities.locations,
        events: Array.isArray(
          (partialContent.entities as Record<string, unknown>)?.events,
        )
          ? ((partialContent.entities as Record<string, unknown>)
              ?.events as string[])
          : defaultAnalysis.contentAnalysis.entities.events,
      },
      hashtagsUsed: Array.isArray(partialContent.hashtagsUsed)
        ? partialContent.hashtagsUsed
        : defaultAnalysis.contentAnalysis.hashtagsUsed,
      qualityMetrics: {
        relevance:
          ((partialContent.qualityMetrics as Record<string, unknown>)
            ?.relevance as number) ||
          defaultAnalysis.contentAnalysis.qualityMetrics.relevance,
        originality:
          ((partialContent.qualityMetrics as Record<string, unknown>)
            ?.originality as number) ||
          defaultAnalysis.contentAnalysis.qualityMetrics.originality,
        clarity:
          ((partialContent.qualityMetrics as Record<string, unknown>)
            ?.clarity as number) ||
          defaultAnalysis.contentAnalysis.qualityMetrics.clarity,
        authenticity:
          ((partialContent.qualityMetrics as Record<string, unknown>)
            ?.authenticity as number) ||
          defaultAnalysis.contentAnalysis.qualityMetrics.authenticity,
        valueAdd:
          ((partialContent.qualityMetrics as Record<string, unknown>)
            ?.valueAdd as number) ||
          defaultAnalysis.contentAnalysis.qualityMetrics.valueAdd,
      },
      engagementAnalysis: {
        overallScore:
          ((partialContent.engagementAnalysis as Record<string, unknown>)
            ?.overallScore as number) ||
          defaultAnalysis.contentAnalysis.engagementAnalysis.overallScore,
        virality:
          ((partialContent.engagementAnalysis as Record<string, unknown>)
            ?.virality as number) ||
          defaultAnalysis.contentAnalysis.engagementAnalysis.virality,
        conversionPotential:
          ((partialContent.engagementAnalysis as Record<string, unknown>)
            ?.conversionPotential as number) ||
          defaultAnalysis.contentAnalysis.engagementAnalysis
            .conversionPotential,
        communityBuilding:
          ((partialContent.engagementAnalysis as Record<string, unknown>)
            ?.communityBuilding as number) ||
          defaultAnalysis.contentAnalysis.engagementAnalysis.communityBuilding,
        thoughtLeadership:
          ((partialContent.engagementAnalysis as Record<string, unknown>)
            ?.thoughtLeadership as number) ||
          defaultAnalysis.contentAnalysis.engagementAnalysis.thoughtLeadership,
      },
    };
  }

  // Handle spam analysis
  if ('spamAnalysis' in partialAnalysis && partialAnalysis.spamAnalysis) {
    const partialSpam = partialAnalysis.spamAnalysis as Record<string, unknown>;
    result.spamAnalysis = {
      isSpam:
        typeof partialSpam.isSpam === 'boolean'
          ? partialSpam.isSpam
          : defaultAnalysis.spamAnalysis.isSpam,
      spamScore:
        (partialSpam.spamScore as number) ||
        defaultAnalysis.spamAnalysis.spamScore,
      reasons: Array.isArray(partialSpam.reasons)
        ? partialSpam.reasons
        : defaultAnalysis.spamAnalysis.reasons,
      confidenceMetrics: {
        linguisticRisk:
          ((partialSpam.confidenceMetrics as Record<string, unknown>)
            ?.linguisticRisk as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.linguisticRisk,
        topicMismatch:
          ((partialSpam.confidenceMetrics as Record<string, unknown>)
            ?.topicMismatch as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.topicMismatch,
        engagementAnomaly:
          ((partialSpam.confidenceMetrics as Record<string, unknown>)
            ?.engagementAnomaly as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.engagementAnomaly,
        promotionalIntent:
          ((partialSpam.confidenceMetrics as Record<string, unknown>)
            ?.promotionalIntent as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.promotionalIntent,
        accountTrustSignals:
          ((partialSpam.confidenceMetrics as Record<string, unknown>)
            ?.accountTrustSignals as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.accountTrustSignals,
      },
    };
  }

  // Handle marketing insights
  if (
    'marketingInsights' in partialAnalysis &&
    partialAnalysis.marketingInsights &&
    typeof partialAnalysis.marketingInsights === 'object'
  ) {
    const partialMarketing = partialAnalysis.marketingInsights as Record<
      string,
      unknown
    >;
    result.marketingInsights = {
      targetAudience: Array.isArray(partialMarketing.targetAudience)
        ? partialMarketing.targetAudience
        : defaultAnalysis.marketingInsights.targetAudience,
      keyTakeaways: Array.isArray(partialMarketing.keyTakeaways)
        ? partialMarketing.keyTakeaways
        : defaultAnalysis.marketingInsights.keyTakeaways,
      contentStrategies: {
        whatWorked: Array.isArray(
          (partialMarketing.contentStrategies as Record<string, unknown>)
            ?.whatWorked,
        )
          ? ((partialMarketing.contentStrategies as Record<string, unknown>)
              ?.whatWorked as string[])
          : defaultAnalysis.marketingInsights.contentStrategies.whatWorked,
        improvement: Array.isArray(
          (partialMarketing.contentStrategies as Record<string, unknown>)
            ?.improvement,
        )
          ? ((partialMarketing.contentStrategies as Record<string, unknown>)
              ?.improvement as string[])
          : defaultAnalysis.marketingInsights.contentStrategies.improvement,
      },
      trendAlignment: {
        currentTrends: Array.isArray(
          (partialMarketing.trendAlignment as Record<string, unknown>)
            ?.currentTrends,
        )
          ? ((partialMarketing.trendAlignment as Record<string, unknown>)
              ?.currentTrends as string[])
          : defaultAnalysis.marketingInsights.trendAlignment.currentTrends,
        emergingOpportunities: Array.isArray(
          (partialMarketing.trendAlignment as Record<string, unknown>)
            ?.emergingOpportunities,
        )
          ? ((partialMarketing.trendAlignment as Record<string, unknown>)
              ?.emergingOpportunities as string[])
          : defaultAnalysis.marketingInsights.trendAlignment
              .emergingOpportunities,
        relevanceScore:
          typeof (partialMarketing.trendAlignment as Record<string, unknown>)
            ?.relevanceScore === 'number'
            ? ((partialMarketing.trendAlignment as Record<string, unknown>)
                ?.relevanceScore as number)
            : defaultAnalysis.marketingInsights.trendAlignment.relevanceScore,
      },
      copywriting: {
        effectiveElements: Array.isArray(
          (partialMarketing.copywriting as Record<string, unknown>)
            ?.effectiveElements,
        )
          ? ((partialMarketing.copywriting as Record<string, unknown>)
              ?.effectiveElements as string[])
          : defaultAnalysis.marketingInsights.copywriting.effectiveElements,
        hooks: Array.isArray(
          (partialMarketing.copywriting as Record<string, unknown>)?.hooks,
        )
          ? ((partialMarketing.copywriting as Record<string, unknown>)
              ?.hooks as string[])
          : defaultAnalysis.marketingInsights.copywriting.hooks,
        callToAction: {
          present:
            typeof (
              (partialMarketing.copywriting as Record<string, unknown>)
                ?.callToAction as Record<string, unknown>
            )?.present === 'boolean'
              ? ((
                  (partialMarketing.copywriting as Record<string, unknown>)
                    ?.callToAction as Record<string, unknown>
                )?.present as boolean)
              : defaultAnalysis.marketingInsights.copywriting.callToAction
                  .present,
          type:
            ((
              (partialMarketing.copywriting as Record<string, unknown>)
                ?.callToAction as Record<string, unknown>
            )?.type as string) ||
            defaultAnalysis.marketingInsights.copywriting.callToAction.type,
          effectiveness:
            typeof (
              (partialMarketing.copywriting as Record<string, unknown>)
                ?.callToAction as Record<string, unknown>
            )?.effectiveness === 'number'
              ? ((
                  (partialMarketing.copywriting as Record<string, unknown>)
                    ?.callToAction as Record<string, unknown>
                )?.effectiveness as number)
              : defaultAnalysis.marketingInsights.copywriting.callToAction
                  .effectiveness,
        },
      },
    };
  } else {
    elizaLogger.warn(
      '[Tweet Analysis] Marketing insights missing or invalid, using defaults',
      {
        hadMarketingInsights: 'marketingInsights' in partialAnalysis,
        marketingInsightsType: typeof partialAnalysis.marketingInsights,
      },
    );
  }

  // Handle actionable recommendations
  if (
    'actionableRecommendations' in partialAnalysis &&
    partialAnalysis.actionableRecommendations
  ) {
    const partialRecs = partialAnalysis.actionableRecommendations as Record<
      string,
      unknown
    >;
    result.actionableRecommendations = {
      engagementStrategies: Array.isArray(partialRecs.engagementStrategies)
        ? partialRecs.engagementStrategies
        : defaultAnalysis.actionableRecommendations.engagementStrategies,
      contentCreation: Array.isArray(partialRecs.contentCreation)
        ? partialRecs.contentCreation
        : defaultAnalysis.actionableRecommendations.contentCreation,
      networkBuilding: Array.isArray(partialRecs.networkBuilding)
        ? partialRecs.networkBuilding
        : defaultAnalysis.actionableRecommendations.networkBuilding,
    };
  }

  elizaLogger.info('[Tweet Processing] Repaired analysis response', {
    wasRepaired: true,
    hadContentAnalysis: 'contentAnalysis' in partialAnalysis,
    hadSpamAnalysis: 'spamAnalysis' in partialAnalysis,
    hadMarketingInsights: 'marketingInsights' in partialAnalysis,
    hadActionableRecommendations:
      'actionableRecommendations' in partialAnalysis,
  });

  return result;
}

/**
 * Extracts and repairs a TweetAnalysis from an AI response object.
 * Handles various response formats and attempts to extract valid JSON.
 * Falls back to default values if extraction fails.
 */
export function extractAndRepairAnalysis(analysis: unknown): TweetAnalysis {
  let parsedAnalysis: TweetAnalysis;

  // Try all possible response formats, from most likely to least likely
  if (typeof analysis === 'string') {
    // Case 1: JSON string - try to parse it first
    try {
      // Clean the string of any potential invalid characters
      let cleanedJson = analysis.trim();

      // Remove any non-JSON content that might be prefixing or suffixing the JSON
      if (cleanedJson.includes('{')) {
        const firstBrace = cleanedJson.indexOf('{');
        const lastBrace = cleanedJson.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
        }
      }

      // Handle special characters and escape sequences
      cleanedJson = cleanedJson
        .replace(/[^\x20-\x7E]+/g, '') // Remove non-printable characters
        .replace(/\\+"/g, '\\"') // Fix escaped quotes
        .replace(/\n/g, '\\n') // Handle newlines
        .replace(/\r/g, '\\r') // Handle carriage returns
        .replace(/\t/g, '\\t'); // Handle tabs

      const parsed = JSON.parse(cleanedJson);
      if (parsed && typeof parsed === 'object' && 'contentAnalysis' in parsed) {
        elizaLogger.info('[Tweet Analysis] Successfully parsed JSON string', {
          jsonLength: cleanedJson.length,
          hasContentAnalysis: Boolean(parsed.contentAnalysis),
          hasMarketingInsights: Boolean(parsed.marketingInsights),
          hasSpamAnalysis: Boolean(parsed.spamAnalysis),
        });
        parsedAnalysis = repairAnalysisResponse(parsed);
      } else {
        elizaLogger.warn(
          '[Tweet Analysis] Parsed JSON missing required fields',
          {
            parsedKeys: Object.keys(parsed || {}),
          },
        );
        parsedAnalysis = repairAnalysisResponse(parsed || {});
      }
    } catch (jsonError) {
      elizaLogger.error('[Tweet Analysis] Failed to parse JSON string', {
        error:
          jsonError instanceof Error ? jsonError.message : String(jsonError),
        errorStack: jsonError instanceof Error ? jsonError.stack : undefined,
        inputType: typeof analysis,
        inputLength: typeof analysis === 'string' ? analysis.length : 0,
        inputSample:
          typeof analysis === 'string'
            ? `${analysis.substring(0, 100)}...`
            : '',
      });

      // Fallback: Try a more aggressive approach to extract JSON
      try {
        const stringAnalysis = analysis as string;
        const jsonMatch = stringAnalysis.match(/{[\s\S]*}/);
        if (jsonMatch?.[0]) {
          const extractedJson = jsonMatch[0];
          const extracted = JSON.parse(extractedJson);
          elizaLogger.info('[Tweet Analysis] Recovered JSON using regex', {
            recoveredLength: extractedJson.length,
          });
          parsedAnalysis = repairAnalysisResponse(extracted);
        } else {
          throw new Error('No JSON object found in string');
        }
      } catch (fallbackError) {
        elizaLogger.error('[Tweet Analysis] Failed fallback JSON extraction', {
          fallbackError:
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError),
        });
        parsedAnalysis = createDefaultAnalysis();
      }
    }
  } else if (
    typeof analysis === 'object' &&
    analysis !== null &&
    'contentAnalysis' in analysis
  ) {
    // Case 2: Direct object with expected fields
    parsedAnalysis = repairAnalysisResponse(
      analysis as Record<string, unknown>,
    );
    elizaLogger.info(
      '[Tweet Analysis] Using direct structured analysis object',
      {
        hasContentAnalysis: 'contentAnalysis' in analysis,
        hasMarketingInsights: 'marketingInsights' in analysis,
        hasSpamAnalysis: 'spamAnalysis' in analysis,
        hasActionableRecommendations: 'actionableRecommendations' in analysis,
      },
    );
  } else {
    // Case 3: Unknown format - try to repair/convert whatever we got
    elizaLogger.warn('[Tweet Analysis] Response in unexpected format', {
      responseType: typeof analysis,
      keys:
        typeof analysis === 'object' && analysis !== null
          ? Object.keys(analysis)
          : [],
    });
    parsedAnalysis = createDefaultAnalysis();
  }

  // Do a final check for required fields and repair if needed
  if (!parsedAnalysis.contentAnalysis || !parsedAnalysis.marketingInsights) {
    elizaLogger.warn(
      '[Tweet Analysis] Analysis incomplete after parsing, repairing',
      {
        hasContentAnalysis: Boolean(parsedAnalysis.contentAnalysis),
        hasMarketingInsights: Boolean(parsedAnalysis.marketingInsights),
        hasSpamAnalysis: Boolean(parsedAnalysis.spamAnalysis),
        hasActionableRecommendations: Boolean(
          parsedAnalysis.actionableRecommendations,
        ),
      },
    );
    parsedAnalysis = repairAnalysisResponse(
      parsedAnalysis as unknown as Partial<Record<string, unknown>>,
    );
  }

  return parsedAnalysis;
}
