/**
 * Extracts mentions from text content
 * @param text The text to extract mentions from
 * @returns Array of usernames mentioned in the text (without @ symbol)
 */
export function extractMentionsFromText(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex) || [];
  return matches.map((mention) => mention.substring(1)); // Remove @ symbol
}
