import type { ImageGenerationOptions } from '../services/image/image-generation';

export interface ImagePromptTemplate {
  prompt: string;
  defaultOptions: ImageGenerationOptions;
}

export const ghibliChickenTemplate: ImagePromptTemplate = {
  prompt: `A serene landscape in Studio Ghibli style featuring a charming chicken as the main character. The scene should have:
- Soft, painterly art style with attention to natural lighting and atmosphere
- A warm, nostalgic color palette
- The chicken should have personality and charm, similar to how Ghibli portrays their animal characters
- Include small environmental details that bring the scene to life`,
  defaultOptions: {
    model: 'gpt-image-1',
    size: '1536x1024',
    quality: 'low',
  } as const,
};

export const imagePrompts = {
  ghibliChicken: ghibliChickenTemplate,
} as const;
