import { elizaLogger } from '@elizaos/core';

/**
 * Extracts JSON from a text string that may contain additional content
 * @param text The text that may contain JSON
 * @returns The extracted JSON string
 */
export function extractJsonFromText(text: string): string {
  try {
    // Find the first { and last } to extract JSON
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start === -1 || end === -1) {
      throw new Error('No JSON object found in text');
    }

    // Extract the JSON string
    let jsonStr = text.substring(start, end + 1);

    // Log the raw JSON string with character codes for debugging
    const charCodes = Array.from(jsonStr.slice(0, 50))
      .map((c) => c.charCodeAt(0))
      .join(',');
    elizaLogger.debug('[Text Processing] Raw JSON string first characters', {
      charCodes,
      rawString: jsonStr.slice(0, 50),
    });

    // Additional clean-up to handle common JSON issues
    jsonStr = fixCommonJsonIssues(jsonStr);

    // Validate that it's valid JSON
    try {
      JSON.parse(jsonStr);
    } catch (parseError) {
      elizaLogger.warn(
        '[Text Processing] Initial JSON parse failed, attempting repair',
        {
          error:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
          jsonPreview:
            jsonStr.substring(0, 100) + (jsonStr.length > 100 ? '...' : ''),
        },
      );

      // Try to fix common JSON issues
      jsonStr = fixBrokenJson(jsonStr);

      // Clean non-printable characters
      jsonStr = removeNonPrintableChars(jsonStr);

      // Try a more aggressive approach if still not valid
      try {
        JSON.parse(jsonStr);
      } catch (_) {
        // Even more aggressive cleaning - strip all whitespace and rebuild
        jsonStr = rebuildJson(jsonStr);
      }

      // Final verification
      JSON.parse(jsonStr);
    }

    return jsonStr;
  } catch (error) {
    elizaLogger.error('[Text Processing] Error extracting JSON from text:', {
      error: error instanceof Error ? error.message : String(error),
      textPreview: text.substring(0, 150) + (text.length > 150 ? '...' : ''),
    });
    throw error;
  }
}

/**
 * Fixes common JSON issues like trailing commas and unquoted properties
 */
function fixCommonJsonIssues(inputJson: string): string {
  // Create a new string with fixes applied
  let result = inputJson;

  // Remove any potential markdown code block markers
  result = result.replace(/```(json)?|```/g, '');

  // Fix trailing commas in objects and arrays
  result = result.replace(/,(\s*[}\]])/g, '$1');

  // Make sure boolean values are lowercase
  result = result.replace(/"isSpam"\s*:\s*TRUE/gi, '"isSpam": true');
  result = result.replace(/"isSpam"\s*:\s*FALSE/gi, '"isSpam": false');

  // Convert single quotes to double quotes
  result = result.replace(/(\w+)\'(\s*:)/g, '"$1"$2');
  result = result.replace(/'([^']+)'/g, '"$1"');

  return result;
}

/**
 * Attempts to repair broken JSON by analyzing the structure
 */
function fixBrokenJson(brokenJson: string): string {
  // Check for missing closing brace at the end
  const openBraces = (brokenJson.match(/{/g) || []).length;
  const closeBraces = (brokenJson.match(/}/g) || []).length;

  let fixedJson = brokenJson;

  // Add missing closing braces
  if (openBraces > closeBraces) {
    const missingBraces = openBraces - closeBraces;
    fixedJson += '}'.repeat(missingBraces);
  }

  // Check for unquoted property names (including when adjacent to quotes)
  const propNameRegex = /([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g;
  fixedJson = fixedJson.replace(propNameRegex, '$1"$2"$3');

  // Fix quoted integers in arrays
  fixedJson = fixedJson.replace(/"(-?\d+(\.\d+)?)"/g, '$1');

  return fixedJson;
}

/**
 * Removes all non-printable and control characters that might break JSON parsing
 */
function removeNonPrintableChars(str: string): string {
  // Create a clean string by only keeping printable characters
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    const code = str.charCodeAt(i);
    // Only keep printable characters
    if (
      (code >= 32 && code <= 126) || // Basic Latin printable
      (code >= 160 && code <= 255) || // Latin-1 Supplement printable
      (code >= 8192 && code <= 8303 && code !== 8203) // Punctuation and excluding zero-width space
    ) {
      result += char;
    }
  }
  return result;
}

/**
 * Complete reconstruction of JSON by extracting keys and values
 * Used when all other repair methods fail
 */
function rebuildJson(jsonStr: string): string {
  try {
    // Strip all whitespace first
    const compactJson = jsonStr.replace(/\s/g, '');

    // Extract keys and values
    const keyValuePairs =
      compactJson.match(/"[^"]+"\s*:\s*("[^"]*"|[^,}{]*)/g) || [];

    // Build clean JSON object
    let result = '{';
    result += keyValuePairs.join(',');
    result += '}';

    // Validate the result
    try {
      JSON.parse(result);
      return result;
    } catch (validationError) {
      elizaLogger.warn('[Text Processing] Rebuilt JSON is still invalid', {
        error:
          validationError instanceof Error
            ? validationError.message
            : String(validationError),
        rebuilt: result,
      });

      // Last resort: manually create a minimal valid JSON object
      return '{"contentAnalysis":{"type":"other","sentiment":"neutral","confidence":0.5,"topics":[],"entities":[],"metrics":{"relevance":0.5,"quality":0.5,"engagement":0.5,"authenticity":0.5,"valueAdd":0.5},"impactScore":0.5},"spamAnalysis":{"isSpam":false,"spamScore":0.1,"reasons":[],"confidenceMetrics":{"linguisticRisk":0.1,"topicMismatch":0.1,"engagementAnomaly":0.1,"promotionalIntent":0.1}}}';
    }
  } catch (error) {
    elizaLogger.error('[Text Processing] Error rebuilding JSON', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return fallback valid JSON
    return '{"contentAnalysis":{"type":"other","sentiment":"neutral","confidence":0.5,"topics":[],"entities":[],"metrics":{"relevance":0.5,"quality":0.5,"engagement":0.5,"authenticity":0.5,"valueAdd":0.5},"impactScore":0.5},"spamAnalysis":{"isSpam":false,"spamScore":0.1,"reasons":[],"confidenceMetrics":{"linguisticRisk":0.1,"topicMismatch":0.1,"engagementAnomaly":0.1,"promotionalIntent":0.1}}}';
  }
}

// Export these functions for use in tweet-processing.ts
export { fixBrokenJson, fixCommonJsonIssues, removeNonPrintableChars };
