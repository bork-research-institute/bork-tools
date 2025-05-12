import {
  type IAgentRuntime,
  ModelProviderName,
  Service,
  ServiceType,
  elizaLogger,
  getEndpoint,
} from '@elizaos/core';
import OpenAI from 'openai';

type GptImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
type DallE2Size = '256x256' | '512x512' | '1024x1024';
type DallE3Size = '1024x1024' | '1792x1024' | '1024x1792';

type GptImageQuality = 'auto' | 'high' | 'medium' | 'low';
type DallE3Quality = 'hd' | 'standard';
type DallE2Quality = 'standard';

export interface ImageGenerationOptions {
  model?: 'dall-e-2' | 'dall-e-3' | 'gpt-image-1';
  size?: GptImageSize | DallE2Size | DallE3Size;
  quality?: GptImageQuality | DallE3Quality | DallE2Quality;
  style?: OpenAI.ImageGenerateParams['style'];
}

export interface ImageGenerationResult {
  base64Data: string;
  metadata?: {
    created: number;
    model: string;
    size?: string;
    quality?: string;
    [key: string]: unknown;
  };
}

export interface IImageGenerationService {
  generateImage(
    prompt: string,
    options?: ImageGenerationOptions,
  ): Promise<ImageGenerationResult>;
}

interface ImageProvider {
  initialize(): Promise<void>;
  generateImage(
    prompt: string,
    options?: ImageGenerationOptions,
  ): Promise<ImageGenerationResult>;
}

class OpenAIImageProvider implements ImageProvider {
  private runtime: IAgentRuntime;
  private openai: OpenAI;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
    const apiKey = this.runtime.getSetting('OPENAI_API_KEY');
    const endpoint = getEndpoint(ModelProviderName.OPENAI);

    this.openai = new OpenAI({
      apiKey,
      baseURL: endpoint,
    });
  }

  async initialize(): Promise<void> {}

  private getDefaultSize(model: string): string {
    switch (model) {
      case 'gpt-image-1':
        return 'auto';
      case 'dall-e-2':
        return '1024x1024';
      case 'dall-e-3':
        return '1024x1024';
      default:
        return '1024x1024';
    }
  }

  private validateSize(model: string, size?: string): string {
    if (!size) {
      return this.getDefaultSize(model);
    }

    const validSizes = {
      'gpt-image-1': ['1024x1024', '1536x1024', '1024x1536', 'auto'],
      'dall-e-2': ['256x256', '512x512', '1024x1024'],
      'dall-e-3': ['1024x1024', '1792x1024', '1024x1792'],
    };

    const modelSizes = validSizes[model as keyof typeof validSizes] || [];
    if (!modelSizes.includes(size)) {
      elizaLogger.warn(
        `Invalid size ${size} for model ${model}, using default size`,
      );
      return this.getDefaultSize(model);
    }

    return size;
  }

  private getDefaultQuality(model: string): string {
    switch (model) {
      case 'gpt-image-1':
        return 'auto';
      case 'dall-e-3':
        return 'standard';
      case 'dall-e-2':
        return 'standard';
      default:
        return 'auto';
    }
  }

  private validateQuality(model: string, quality?: string): string {
    if (!quality) {
      return this.getDefaultQuality(model);
    }

    const validQualities = {
      'gpt-image-1': ['auto', 'high', 'medium', 'low'],
      'dall-e-3': ['hd', 'standard'],
      'dall-e-2': ['standard'],
    };

    const modelQualities =
      validQualities[model as keyof typeof validQualities] || [];
    if (!modelQualities.includes(quality)) {
      elizaLogger.warn(
        `Invalid quality ${quality} for model ${model}, using default quality`,
      );
      return this.getDefaultQuality(model);
    }

    return quality;
  }

  async generateImage(
    prompt: string,
    options: ImageGenerationOptions = {},
  ): Promise<ImageGenerationResult> {
    try {
      const model = options.model || 'gpt-image-1';
      const size = this.validateSize(model, options.size);
      const quality = this.validateQuality(model, options.quality);

      // Always request base64 format
      const params: OpenAI.ImageGenerateParams = {
        model,
        prompt,
        size: size as OpenAI.ImageGenerateParams['size'],
        quality: quality as OpenAI.ImageGenerateParams['quality'],
        style: options.style,
        response_format: 'b64_json',
      };

      const result = await this.openai.images.generate(params);

      if (!result.data[0].b64_json) {
        throw new Error('No image data received from generation service');
      }

      return {
        base64Data: result.data[0].b64_json,
        metadata: {
          created: Math.floor(Date.now() / 1000),
          model,
          size,
          quality,
          ...options,
        },
      };
    } catch (err) {
      elizaLogger.error('Error in generateImage:', err);
      throw err;
    }
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
}

export default ImageGenerationService;
