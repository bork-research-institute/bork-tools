import { messageCompletionFooter } from '@elizaos/core';

export const twitterMessageHandlerTemplate = `
# Areas of Expertise
{{knowledge}}

# About {{agentName}} (@{{twitterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

{{recentPosts}}

# Task: Generate a post/reply in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}) while using the thread of tweets as additional context:
Current Post:
{{currentPost}}

Thread of Tweets You Are Replying To:
{{formattedConversation}}

{{actions}}

# Task: Generate a post in the voice, style and perspective of {{agentName}} (@{{twitterUserName}}). You MUST include an action if the current post text includes a prompt that is similar to one of the available actions mentioned here:
{{actionNames}}

Here is the current post text again. Remember to include an action if the current post text includes a prompt that asks for one of the available actions mentioned above (does not need to be exact):
{{currentPost}}

# IMPORTANT: Your response MUST be 280 characters or less to comply with Twitter's character limit. If you need to be concise, prioritize the main message and key points.
${messageCompletionFooter}`;

export const twitterShouldRespondTemplate = `# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation.

# Areas of Expertise
{{knowledge}}

# About {{agentName}}:
{{bio}}
{{lore}}
{{topics}}

{{providers}}

{{characterPostExamples}}

{{postDirections}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

{{recentPosts}}

Current Post:
{{currentPost}}

Thread of Tweets You Are Replying To:
{{formattedConversation}}

Actions:
{{actions}}
{{actionNames}}

# Task: Determine if {{agentName}} should respond to this message. Consider:
1. Is the message relevant to {{agentName}}'s expertise and interests?
2. Is the message a prompt for an action?
3. Would a response add value to the conversation?
4. Is the message spam or low quality?
5. Is the message directed at {{agentName}}?

Spam Detection Guidelines:
1. Primary Spam Indicators (Must have at least one):
   - Promotional Content:
     * Aggressive sales language ("Buy now!", "Don't miss out!")
     * Get-rich-quick promises
     * Multiple promotional links
   - Engagement Farming:
     * Follow-for-follow schemes
     * Giveaway spam ("RT & Follow to win!")
     * Mass-copied engagement bait

2. Secondary Spam Signals (Multiple required):
   - Hashtag Abuse:
     * More than 7 hashtags
     * Completely unrelated trending hashtags
   - Suspicious Patterns:
     * Exact duplicate tweets
     * Automated-looking content
     * Coordinated spam campaigns
   - Deceptive Tactics:
     * Fake celebrity endorsements
     * Obviously false claims
     * Phishing attempts

3. NOT Spam:
   - Normal Conversations:
     * Personal opinions
     * Questions and responses
     * Casual discussions
     * Emotional expressions
   - Regular Marketing:
     * Product announcements
     * Company updates
     * Professional promotions
   - Community Engagement:
     * Genuine discussions
     * Topic-specific hashtags
     * Industry news sharing

Return one of these responses:
- "RESPOND" - If the message is relevant, valuable, and not spam
- "IGNORE" - If the message is irrelevant or we've already responded
- "SPAM" - If the message matches spam criteria above (include JSON after SPAM with reasons)

Example SPAM response:
SPAM {"spamScore":0.95,"reasons":["engagement farming giveaway","follow-for-follow scheme","automated content"]}

${messageCompletionFooter}`;
