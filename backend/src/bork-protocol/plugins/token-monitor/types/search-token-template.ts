// Template for extracting a Solana token address (contract address) from a user message.
// Usage: Used by the agent to extract the token address for search actions.
export const searchTokenTemplate = `# Task: Extract Solana Token Address from the last message

# Recent conversation with a client
{{recentMessages}}

# Instructions
Extract the Solana token address (contract address, CA) mentioned in the last message, if any. 
Return ONLY the address as a string. If no address is found, return an empty string.

# Response Format
Respond with a JSON object containing the token details:

\`\`\`json
{
    "tokenAddress": "string"
}
\`\`\`
`;
