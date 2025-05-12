import { pinata } from '@/config/pinata';
import type { UploadInput } from '@/types/pinata/pinata';

export async function uploadImage(image: UploadInput): Promise<string> {
  try {
    // Convert buffer to File object
    const file = new File([image.buffer], image.filename, {
      type: image.mimetype,
    });

    // Upload file to Pinata
    const { cid } = await pinata.upload.public.file(file);

    console.log('upload successful');

    // Get the gateway URL
    const url = await pinata.gateways.public.convert(cid);
    return url;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}
