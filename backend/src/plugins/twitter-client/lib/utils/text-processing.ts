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

    const jsonStr = text.substring(start, end + 1);

    // Validate that it's valid JSON
    JSON.parse(jsonStr);

    return jsonStr;
  } catch (error) {
    elizaLogger.error('[Text Processing] Error extracting JSON from text:', {
      error: error instanceof Error ? error.message : String(error),
      textPreview: text.substring(0, 100),
    });
    throw error;
  }
}
