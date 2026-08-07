import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { base64ByteLength } from "@/utils/base64";

const DEFAULT_MAX_BYTES = 3_000_000;

const LADDER = [
  { width: 1280, compress: 0.82 },
  { width: 1024, compress: 0.78 },
  { width: 832, compress: 0.74 },
  { width: 640, compress: 0.7 },
  { width: 512, compress: 0.65 },
] as const;

const stripDataUriPrefix = (b64: string): string => {
  if (!b64.startsWith("data:")) return b64;
  const comma = b64.indexOf(",");
  return comma === -1 ? b64 : b64.slice(comma + 1);
};

/**
 * Resize an Expo image URI into a raw-base64 JPEG that fits inside the Vercel
 * request-body limit for image input requests.
 */
export async function resizeForUpload(
  imageUri: string,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  for (const step of LADDER) {
    const context = ImageManipulator.manipulate(imageUri);
    context.resize({ width: step.width });

    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: step.compress,
      base64: true,
    });

    if (saved.base64 && base64ByteLength(saved.base64) <= maxBytes) {
      return {
        base64: stripDataUriPrefix(saved.base64),
        mimeType: "image/jpeg",
      };
    }
  }

  throw new Error("IMAGE_TOO_LARGE");
}
