import fs from 'node:fs';
import path from 'node:path';
import {
  type IAgentRuntime,
  ModelProviderName,
  Service,
  ServiceType,
  elizaLogger,
  getEndpoint,
} from '@elizaos/core';

export interface ImageGenerationOptions {
  model?: 'dall-e-2' | 'dall-e-3';
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  numberOfImages?: number;
  responseFormat?: 'url' | 'b64_json';
  user?: string;
}

export interface ImageGenerationResult {
  imageUrls: string[];
  metadata?: {
    created: number;
    model: string;
    [key: string]: unknown;
  };
}

export interface IImageGenerationService {
  generateImage(
    prompt: string,
    options?: ImageGenerationOptions,
  ): Promise<ImageGenerationResult>;
  saveGeneratedImage(imageUrl: string, outputPath: string): Promise<string>;
}

interface ImageProvider {
  initialize(): Promise<void>;
  generateImage(
    prompt: string,
    options?: ImageGenerationOptions,
  ): Promise<ImageGenerationResult>;
}

const handleApiError = async (
  response: Response,
  provider: string,
): Promise<never> => {
  const responseText = await response.text();
  elizaLogger.error(
    `${provider} API error:`,
    response.status,
    '-',
    responseText,
  );
  throw new Error(`HTTP error! status: ${response.status}`);
};

class OpenAIImageProvider implements ImageProvider {
  private runtime: IAgentRuntime;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async initialize(): Promise<void> {}

  async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {},
  ): Promise<ImageGenerationResult> {
    const endpoint =
      getEndpoint(ModelProviderName.OPENAI) ?? 'https://api.openai.com/v1';

    const model = options.model || 'dall-e-3';
    const defaultSize = model === 'dall-e-3' ? '1792x1024' : '1024x1024';

    const requestBody = {
      model,
      prompt,
      n: model === 'dall-e-3' ? 1 : options.numberOfImages || 1,
      size: options.size || defaultSize,
      quality: options.quality || 'standard',
      style: options.style || 'vivid',
      response_format: options.responseFormat || 'url',
      user: options.user,
    };

    const response = await fetch(`${endpoint}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.runtime.getSetting('OPENAI_API_KEY')}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      await handleApiError(response, 'OpenAI');
    }

    const data = (await response.json()) as {
      created: number;
      data: Array<{ url: string }>;
    };

    return {
      imageUrls: data.data.map((item) => item.url),
      metadata: {
        created: data.created,
        model: requestBody.model,
        ...options,
      },
    };
  }
}

export class ImageGenerationService extends Service {
  static serviceType: ServiceType = ServiceType.IMAGE_DESCRIPTION;

  private initialized = false;
  private runtime: IAgentRuntime | null = null;
  private provider: ImageProvider | null = null;

  async initialize(runtime: IAgentRuntime): Promise<void> {
    elizaLogger.log('Initializing ImageGenerationService');
    this.runtime = runtime;
  }

  private async initializeProvider(): Promise<boolean> {
    if (!this.runtime) {
      throw new Error('Runtime is required for image generation');
    }

    this.provider = new OpenAIImageProvider(this.runtime);
    elizaLogger.debug('Using OpenAI for image generation model');

    try {
      await this.provider.initialize();
      return true;
    } catch {
      elizaLogger.error(
        'Failed to initialize the OpenAI image generation provider',
      );
      return false;
    }
  }

  async generateImage(
    prompt: string,
    options?: ImageGenerationOptions,
  ): Promise<ImageGenerationResult> {
    if (!this.initialized) {
      this.initialized = await this.initializeProvider();
    }

    if (!this.initialized || !this.provider) {
      throw new Error('Image generation service not properly initialized');
    }

    try {
      return await this.provider.generateImage(prompt, options);
    } catch (err) {
      elizaLogger.error('Error in generateImage:', err);
      throw err;
    }
  }

  async saveGeneratedImage(
    imageUrl: string,
    outputPath: string,
  ): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const fullPath = path.resolve(outputPath);

      fs.writeFileSync(fullPath, buffer);
      return fullPath;
    } catch (err) {
      elizaLogger.error('Error saving generated image:', err);
      throw err;
    }
  }
}

export default ImageGenerationService;
