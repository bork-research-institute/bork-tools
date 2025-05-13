// Maximum file size (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type UploadInput = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
};

export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

export const ALLOWED_IMAGE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
] as const;

export type AllowedImageExtension = (typeof ALLOWED_IMAGE_EXTENSIONS)[number];
