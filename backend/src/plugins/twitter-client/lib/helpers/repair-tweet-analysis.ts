import { elizaLogger } from '@elizaos/core';
import type { TweetAnalysis } from '../types/analysis';
import {
  extractJsonFromText,
  removeNonPrintableChars,
} from '../utils/text-processing';

/**
 * Creates a default TweetAnalysis object with reasonable default values
 * Used as a fallback when the AI response is malformed
 */
export function createDefaultAnalysis(): TweetAnalysis {
  return {
    contentAnalysis: {
      type: 'other',
      sentiment: 'neutral',
      confidence: 0.5,
      impactScore: 0.5,
      entities: [],
      topics: [],
      metrics: {
        relevance: 0.5,
        quality: 0.5,
        engagement: 0.5,
        authenticity: 0.5,
        valueAdd: 0.5,
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
      },
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

  // Handle case where we have a flattened structure
  if ('type' in partialAnalysis && 'sentiment' in partialAnalysis) {
    // We have content analysis fields at the top level
    result.contentAnalysis = {
      type:
        (partialAnalysis.type as string) ||
        defaultAnalysis.contentAnalysis.type,
      sentiment:
        (partialAnalysis.sentiment as string) ||
        defaultAnalysis.contentAnalysis.sentiment,
      confidence:
        (partialAnalysis.confidence as number) ||
        defaultAnalysis.contentAnalysis.confidence,
      impactScore:
        (partialAnalysis.impactScore as number) ||
        defaultAnalysis.contentAnalysis.impactScore,
      entities: Array.isArray(partialAnalysis.entities)
        ? (partialAnalysis.entities as string[])
        : defaultAnalysis.contentAnalysis.entities,
      topics: Array.isArray(partialAnalysis.topics)
        ? (partialAnalysis.topics as string[])
        : defaultAnalysis.contentAnalysis.topics,
      metrics: {
        relevance:
          (partialAnalysis.relevance as number) ||
          ((partialAnalysis.metrics as Record<string, unknown>)
            ?.relevance as number) ||
          defaultAnalysis.contentAnalysis.metrics.relevance,
        quality:
          (partialAnalysis.quality as number) ||
          ((partialAnalysis.metrics as Record<string, unknown>)
            ?.quality as number) ||
          defaultAnalysis.contentAnalysis.metrics.quality,
        engagement:
          (partialAnalysis.engagement as number) ||
          ((partialAnalysis.metrics as Record<string, unknown>)
            ?.engagement as number) ||
          defaultAnalysis.contentAnalysis.metrics.engagement,
        authenticity:
          (partialAnalysis.authenticity as number) ||
          ((partialAnalysis.metrics as Record<string, unknown>)
            ?.authenticity as number) ||
          defaultAnalysis.contentAnalysis.metrics.authenticity,
        valueAdd:
          (partialAnalysis.valueAdd as number) ||
          ((partialAnalysis.metrics as Record<string, unknown>)
            ?.valueAdd as number) ||
          defaultAnalysis.contentAnalysis.metrics.valueAdd,
      },
    };
  } else if (
    'contentAnalysis' in partialAnalysis &&
    partialAnalysis.contentAnalysis
  ) {
    // We have a nested contentAnalysis object
    const partialContent = partialAnalysis.contentAnalysis as Record<
      string,
      unknown
    >;
    result.contentAnalysis = {
      type:
        (partialContent.type as string) || defaultAnalysis.contentAnalysis.type,
      sentiment:
        (partialContent.sentiment as string) ||
        defaultAnalysis.contentAnalysis.sentiment,
      confidence:
        (partialContent.confidence as number) ||
        defaultAnalysis.contentAnalysis.confidence,
      impactScore:
        (partialContent.impactScore as number) ||
        defaultAnalysis.contentAnalysis.impactScore,
      entities: Array.isArray(partialContent.entities)
        ? (partialContent.entities as string[])
        : defaultAnalysis.contentAnalysis.entities,
      topics: Array.isArray(partialContent.topics)
        ? (partialContent.topics as string[])
        : defaultAnalysis.contentAnalysis.topics,
      metrics: {
        relevance:
          ((partialContent.metrics as Record<string, unknown>)
            ?.relevance as number) ||
          defaultAnalysis.contentAnalysis.metrics.relevance,
        quality:
          ((partialContent.metrics as Record<string, unknown>)
            ?.quality as number) ||
          defaultAnalysis.contentAnalysis.metrics.quality,
        engagement:
          ((partialContent.metrics as Record<string, unknown>)
            ?.engagement as number) ||
          defaultAnalysis.contentAnalysis.metrics.engagement,
        authenticity:
          ((partialContent.metrics as Record<string, unknown>)
            ?.authenticity as number) ||
          defaultAnalysis.contentAnalysis.metrics.authenticity,
        valueAdd:
          ((partialContent.metrics as Record<string, unknown>)
            ?.valueAdd as number) ||
          defaultAnalysis.contentAnalysis.metrics.valueAdd,
      },
    };
  }

  // Handle spam analysis
  if ('isSpam' in partialAnalysis || 'spamScore' in partialAnalysis) {
    // Spam fields at top level
    result.spamAnalysis = {
      isSpam:
        typeof partialAnalysis.isSpam === 'boolean'
          ? partialAnalysis.isSpam
          : defaultAnalysis.spamAnalysis.isSpam,
      spamScore:
        (partialAnalysis.spamScore as number) ||
        defaultAnalysis.spamAnalysis.spamScore,
      reasons: Array.isArray(partialAnalysis.reasons)
        ? (partialAnalysis.reasons as string[])
        : defaultAnalysis.spamAnalysis.reasons,
      confidenceMetrics: {
        linguisticRisk:
          (partialAnalysis.linguisticRisk as number) ||
          ((partialAnalysis.confidenceMetrics as Record<string, unknown>)
            ?.linguisticRisk as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.linguisticRisk,
        topicMismatch:
          (partialAnalysis.topicMismatch as number) ||
          ((partialAnalysis.confidenceMetrics as Record<string, unknown>)
            ?.topicMismatch as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.topicMismatch,
        engagementAnomaly:
          (partialAnalysis.engagementAnomaly as number) ||
          ((partialAnalysis.confidenceMetrics as Record<string, unknown>)
            ?.engagementAnomaly as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.engagementAnomaly,
        promotionalIntent:
          (partialAnalysis.promotionalIntent as number) ||
          ((partialAnalysis.confidenceMetrics as Record<string, unknown>)
            ?.promotionalIntent as number) ||
          defaultAnalysis.spamAnalysis.confidenceMetrics.promotionalIntent,
      },
    };
  } else if (
    'spamAnalysis' in partialAnalysis &&
    partialAnalysis.spamAnalysis
  ) {
    // We have a nested spamAnalysis object
    const partialSpam = partialAnalysis.spamAnalysis as Record<string, unknown>;
    result.spamAnalysis = {
      isSpam:
        typeof partialSpam.isSpam === 'boolean'
          ? (partialSpam.isSpam as boolean)
          : defaultAnalysis.spamAnalysis.isSpam,
      spamScore:
        (partialSpam.spamScore as number) ||
        defaultAnalysis.spamAnalysis.spamScore,
      reasons: Array.isArray(partialSpam.reasons)
        ? (partialSpam.reasons as string[])
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
      },
    };
  }

  elizaLogger.info('[Tweet Processing] Repaired analysis response', {
    wasRepaired: true,
    hadContentAnalysis: 'contentAnalysis' in partialAnalysis,
    hadSpamAnalysis: 'spamAnalysis' in partialAnalysis,
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
  if (
    typeof analysis === 'object' &&
    analysis !== null &&
    'spamAnalysis' in analysis &&
    'contentAnalysis' in analysis
  ) {
    // Case 1: Direct structured output with expected fields
    parsedAnalysis = analysis as TweetAnalysis;
    elizaLogger.info(
      '[Tweet Analysis] Using direct structured analysis object',
    );
  } else if (
    typeof analysis === 'object' &&
    analysis !== null &&
    'text' in analysis &&
    typeof (analysis as { text: unknown }).text === 'string'
  ) {
    try {
      // First try the standard extraction
      const cleanedText = extractJsonFromText(
        (analysis as { text: string }).text,
      );
      parsedAnalysis = JSON.parse(cleanedText) as TweetAnalysis;
    } catch (jsonError) {
      // Fall back to a simpler approach - use a super-resilient regex to find anything that looks like JSON
      elizaLogger.warn(
        '[Tweet Analysis] Standard JSON extraction failed, trying regex approach',
        {
          error:
            jsonError instanceof Error ? jsonError.message : String(jsonError),
        },
      );

      // Generate fallback analysis to use if extraction completely fails
      const fallbackAnalysis = createDefaultAnalysis();

      try {
        // Try to extract anything that looks like a JSON object
        const jsonMatch = (analysis as { text: string }).text.match(
          /{[\s\S]*}/,
        );
        if (jsonMatch) {
          const jsonCandidate = jsonMatch[0];
          // Use the string sanitizer to clean up any issues
          const sanitizedJson = removeNonPrintableChars(jsonCandidate);

          // Try to parse it, falling back to the default if needed
          try {
            parsedAnalysis = JSON.parse(sanitizedJson) as TweetAnalysis;
          } catch (parseError) {
            elizaLogger.error(
              '[Tweet Analysis] Failed to parse extracted JSON candidate',
              {
                error:
                  parseError instanceof Error
                    ? parseError.message
                    : String(parseError),
                candidate:
                  sanitizedJson.substring(0, 100) +
                  (sanitizedJson.length > 100 ? '...' : ''),
              },
            );
            parsedAnalysis = fallbackAnalysis;
          }
        } else {
          // No JSON object found at all
          elizaLogger.error(
            '[Tweet Analysis] No JSON pattern found in text response',
          );
          parsedAnalysis = fallbackAnalysis;
        }
      } catch (regexError) {
        // If even regex fails, use default
        elizaLogger.error('[Tweet Analysis] Regex extraction failed', {
          error:
            regexError instanceof Error
              ? regexError.message
              : String(regexError),
        });
        parsedAnalysis = fallbackAnalysis;
      }
    }
  } else if (
    typeof analysis === 'object' &&
    analysis !== null &&
    'content' in analysis &&
    typeof (analysis as { content: unknown }).content === 'string'
  ) {
    // Case 3: Try content field which might contain JSON
    try {
      const contentText = (analysis as { content: string }).content;
      const jsonMatch = contentText.match(/{[\s\S]*}/);
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[0]) as TweetAnalysis;
      } else {
        parsedAnalysis = repairAnalysisResponse(
          analysis as Partial<Record<string, unknown>>,
        );
      }
    } catch (contentError) {
      elizaLogger.error(
        '[Tweet Analysis] Failed to extract JSON from content field',
        {
          error:
            contentError instanceof Error
              ? contentError.message
              : String(contentError),
        },
      );
      parsedAnalysis = repairAnalysisResponse(
        analysis as Partial<Record<string, unknown>>,
      );
    }
  } else {
    // Case 4: Unknown format - try to repair/convert whatever we got
    elizaLogger.warn(
      '[Tweet Analysis] Response in unexpected format, attempting repair',
      {
        responseType: typeof analysis,
        keys:
          typeof analysis === 'object' && analysis !== null
            ? Object.keys(analysis)
            : [],
      },
    );
    parsedAnalysis = repairAnalysisResponse(
      analysis as Partial<Record<string, unknown>>,
    );
  }

  // Do a final check for required fields and repair if needed
  if (!parsedAnalysis.spamAnalysis || !parsedAnalysis.contentAnalysis) {
    elizaLogger.warn(
      '[Tweet Analysis] Analysis incomplete after parsing, repairing',
      {
        hasContentAnalysis: Boolean(parsedAnalysis.contentAnalysis),
        hasSpamAnalysis: Boolean(parsedAnalysis.spamAnalysis),
      },
    );
    parsedAnalysis = repairAnalysisResponse(
      parsedAnalysis as unknown as Partial<Record<string, unknown>>,
    );
  }

  return parsedAnalysis;
}
