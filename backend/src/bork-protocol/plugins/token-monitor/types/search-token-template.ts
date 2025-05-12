// Template for extracting a Solana token address (contract address) from a user message.
// Usage: Used by the agent to extract the token address for search actions.
export const searchTokenTemplate = `
Given the following user message, extract the Solana token address (contract address, CA) mentioned, if any. 
Return ONLY the address as a string. If no address is found, return an empty string.

User message: {{state.message.content.text}}
`;
