import { NativeModule, requireOptionalNativeModule } from "expo";

export type OnDeviceModelStatus =
  | "appleIntelligenceNotEnabled"
  | "available"
  | "deviceNotEligible"
  | "modelNotReady"
  | "unavailable"
  | "unsupportedOS";

export interface CaptureCapabilities {
  /** Apple Foundation Models status (iOS 26+ on Apple Intelligence devices). */
  onDeviceModel: OnDeviceModelStatus;
  /** Vision text recognition (iOS 18+). */
  textRecognition: boolean;
}

export interface RecognizedImageText {
  /** Epoch millis the image was taken, when its metadata records it. */
  capturedAt?: number;
  /** Recognised lines in reading order, newline-separated. */
  text: string;
}

/** Raw model output; amounts are strings copied from the text. */
export interface OnDeviceExtractedTransaction {
  amount: string;
  balanceAfter?: string;
  counterparty?: string;
  currency?: string;
  toAmount?: string;
  toCurrency?: string;
  direction: "credit" | "debit";
  fee?: string;
  institution?: string;
  /** "YYYY-MM-DD HH:MM" when printed in the message. */
  occurredAt?: string;
  reference?: string;
  sourceText: string;
  summary: string;
  transactionId?: string;
}

/** Error codes thrown by `extractTransactionsAsync`. */
export const CAPTURE_ERROR_CODES = {
  extractionFailed: "ERR_EXTRACTION_FAILED",
  inputTooLong: "ERR_INPUT_TOO_LONG",
  modelUnavailable: "ERR_MODEL_UNAVAILABLE",
} as const;

declare class BalancedCaptureNativeModule extends NativeModule {
  extractTransactionsAsync(
    text: string
  ): Promise<OnDeviceExtractedTransaction[]>;
  getCapabilities(): CaptureCapabilities;
  recognizeTextAsync(uri: string): Promise<RecognizedImageText>;
}

// Optional so Android, web, and binaries built before this module still load.
const nativeModule =
  requireOptionalNativeModule<BalancedCaptureNativeModule>("BalancedCapture");

const UNSUPPORTED: CaptureCapabilities = {
  onDeviceModel: "unsupportedOS",
  textRecognition: false,
};

export const getCaptureCapabilities = (): CaptureCapabilities =>
  nativeModule?.getCapabilities() ?? UNSUPPORTED;

export const recognizeImageText = async (
  uri: string
): Promise<RecognizedImageText> => {
  if (!nativeModule) {
    throw new Error("On-device text recognition is not available");
  }
  return await nativeModule.recognizeTextAsync(uri);
};

export const extractTransactionsOnDevice = async (
  text: string
): Promise<OnDeviceExtractedTransaction[]> => {
  if (!nativeModule) {
    throw new Error("The on-device model is not available");
  }
  return await nativeModule.extractTransactionsAsync(text);
};
