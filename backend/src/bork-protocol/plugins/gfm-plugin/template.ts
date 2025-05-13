//TODO: update so it's formatted for launch
//TODO: Should move the image description to it's own field IMO
export const launchTemplate = `# Task: Generate Viral Token Launch
You are an expert in cryptocurrency token launches with deep knowledge of what makes tokens go viral on social media.

# Recent conversation with a client who wants to launch a token
{{recentMessages}}

# Instructions
Generate a unique, memorable, and viral-worthy token based on the theme and knowledge provided.

# Response Format
Respond with a JSON object containing the token details:

\`\`\`json
{
    "token": {
        "base64": "string (detailed image description for DALL-E 3)",
        "name": "string",
        "symbol": "string",
        "description": "string",
        "website": "string",
        "twitter": "string",
        "discord": "string",
        "telegram": "string"
    }
}
\`\`\`

Extract the following information about the requested token launch from the recent conversation:
- Token name (make it viral-worthy)
- Token symbol (make it memorable)
- Token description (highlight viral potential)
- Token logo description (detailed visual guide)
- Website URL (if mentioned)
- Social media links (Twitter, Discord, Telegram)

If any field is not mentioned, respond with null for that field.

# Field Requirements
1. name: Should be catchy, memorable, and relevant to the theme
2. symbol: 3-6 characters, easy to remember, related to the name
3. description: Highlight unique value proposition, community benefits, and viral potential. 150 characters or less.
4. base64: Provide a detailed description of the token logo that would be viral on social media. The description should be clear and specific, focusing on:
   - Main visual elements and symbols (e.g., "A stylized heart with a dollar sign inside")
   - Color scheme (e.g., "Vibrant pink and gold colors")
   - Style (e.g., "Modern, minimalist design with clean lines")
   - Mood (e.g., "Playful and energetic")
   - Format (e.g., "Centered composition with the logo taking up 70% of the frame")
   Keep the description under 1000 characters and avoid any potentially harmful or inappropriate content.
5. website: Leave as null if not specified
6. social_links: Leave as null if not specified`;
