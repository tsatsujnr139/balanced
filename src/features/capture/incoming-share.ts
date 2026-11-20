import { requireOptionalNativeModule } from "expo";

import type { CaptureImage } from "./capture-context";

export interface IncomingShare {
  images: CaptureImage[];
  text: string;
}

/**
 * Takes screenshots and text shared to the app from the share sheet, once.
 * Builds without the share extension (before expo-sharing) return null.
 */
export const takeIncomingShare = async (): Promise<IncomingShare | null> => {
  if (!requireOptionalNativeModule("ExpoSharing")) {
    return null;
  }
  // Loaded lazily so older builds never evaluate the missing native module.
  const Sharing = await import("expo-sharing");
  if (Sharing.getSharedPayloads().length === 0) {
    return null;
  }
  const payloads = await Sharing.getResolvedSharedPayloadsAsync();
  Sharing.clearSharedPayloads();

  const images: CaptureImage[] = [];
  const texts: string[] = [];
  for (const payload of payloads) {
    if (payload.contentType === "image" && payload.contentUri) {
      images.push({
        mimeType: payload.contentMimeType ?? undefined,
        name:
          payload.originalName ?? `shared-${Date.now()}-${images.length}.png`,
        uri: payload.contentUri,
      });
    } else if (payload.shareType === "text" && payload.value.trim()) {
      texts.push(payload.value.trim());
    }
  }
  return { images, text: texts.join("\n\n") };
};
