import { normalizeModelTransactions } from "@/convex/lib/capture/model";
import type { ModelExtractedTransaction } from "@/convex/lib/capture/model";
import { parseCaptureText } from "@/convex/lib/capture/parser";
import type { ParsedCaptureTransaction } from "@/convex/lib/capture/parser";
import { redactSensitive } from "@/convex/lib/capture/redact";
import { resolveTransfers } from "@/convex/lib/capture/transfers";
import type { CapturedTransfer } from "@/convex/lib/capture/transfers";

import {
  extractTransactionsOnDevice,
  getCaptureCapabilities,
  recognizeImageText,
} from "../../../modules/balanced-capture";

export type CaptureInput =
  | { capturedAt?: number; kind: "image"; uri: string }
  | { kind: "text"; text: string };

export type CaptureReader = "cloud" | "on-device" | "pattern";

export interface CapturedTransaction {
  /** Which step read this transaction. */
  reader: CaptureReader;
  /** Screenshot it came from, if any. */
  sourceImageUri?: string;
  transaction: CapturedTransfer;
}

export interface CaptureResult {
  /** Why leftover text wasn't read, when it wasn't. */
  modelIssue?: string;
  /** Combined recognised or entered text. */
  sourceText: string;
  /** Capture time used to resolve "Yesterday"-style timestamps. */
  referenceDate: Date;
  transactions: CapturedTransaction[];
  /** Text that mentions amounts but no step could read (e.g. cut-off messages). */
  unreadSegments: string[];
}

export type CloudExtractor = (
  text: string
) => Promise<ModelExtractedTransaction[]>;

interface ReadInput {
  imageUri?: string;
  /** Typed or dictated by the user rather than read from a screenshot. */
  isTyped: boolean;
  referenceDate: Date;
  text: string;
}

const readInput = async (input: CaptureInput): Promise<ReadInput> => {
  if (input.kind === "text") {
    return { isTyped: true, referenceDate: new Date(), text: input.text };
  }
  if (!getCaptureCapabilities().textRecognition) {
    throw new Error("Reading screenshots needs iOS 18 or later.");
  }
  const recognized = await recognizeImageText(input.uri);
  return {
    imageUri: input.uri,
    isTyped: false,
    referenceDate: new Date(
      recognized.capturedAt ?? input.capturedAt ?? Date.now()
    ),
    text: recognized.text,
  };
};

const HAS_NUMBER = /\d/;

/**
 * A quick note like "Boiled groundnut 20 cash" has no currency, so the
 * patterns don't flag it as a missed notification; the models should still try.
 */
const typedNote = (read: ReadInput, transactionsFound: number): string[] => {
  const text = read.text.trim();
  return read.isTyped && transactionsFound === 0 && HAS_NUMBER.test(text)
    ? [text]
    : [];
};

const describeError = (error: unknown): string => {
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code);
  }
  return error instanceof Error ? error.message : "unknown";
};

const extractOnDevice = async (
  text: string
): Promise<{ issue?: string; transactions?: ParsedCaptureTransaction[] }> => {
  const { onDeviceModel } = getCaptureCapabilities();
  if (onDeviceModel !== "available") {
    return { issue: `on-device model: ${onDeviceModel}` };
  }
  try {
    const extracted = await extractTransactionsOnDevice(text);
    return { transactions: normalizeModelTransactions(extracted, text) };
  } catch (error) {
    return { issue: `on-device model: ${describeError(error)}` };
  }
};

const extractInCloud = async (
  text: string,
  cloud: CloudExtractor | undefined
): Promise<{ issue?: string; transactions?: ParsedCaptureTransaction[] }> => {
  if (!cloud) {
    return { issue: "cloud model: not configured" };
  }
  try {
    // Account numbers and emails never leave the phone.
    const extracted = await cloud(redactSensitive(text));
    return { transactions: normalizeModelTransactions(extracted, text) };
  } catch (error) {
    return { issue: `cloud model: ${describeError(error)}` };
  }
};

/**
 * Turns pasted/dictated text or screenshots into draft transactions.
 * Known formats are parsed exactly. Leftover text goes to the on-device
 * model, then (if that can't help) to the cloud model.
 */
export const parseCapture = async (
  inputs: CaptureInput[],
  options: {
    cloud?: CloudExtractor;
    forceCloud?: boolean;
    /** Names that identify the user, to spot transfers to their own accounts. */
    ownerNames?: string[];
  } = {}
): Promise<CaptureResult> => {
  const reads = await Promise.all(inputs.map(readInput));
  const transactions: CapturedTransaction[] = [];
  const seenRefs = new Set<string>();
  const leftovers: { imageUri?: string; isTyped: boolean; text: string }[] = [];

  const add = (
    transaction: ParsedCaptureTransaction,
    reader: CaptureReader,
    sourceImageUri?: string
  ) => {
    if (seenRefs.has(transaction.externalRef)) {
      return;
    }
    seenRefs.add(transaction.externalRef);
    transactions.push({ reader, sourceImageUri, transaction });
  };

  for (const read of reads) {
    const parsed = parseCaptureText(read.text, {
      referenceDate: read.referenceDate,
    });
    for (const transaction of parsed.transactions) {
      add(transaction, "pattern", read.imageUri);
    }
    const unparsed =
      parsed.unparsedSegments.length > 0
        ? parsed.unparsedSegments
        : typedNote(read, parsed.transactions.length);
    if (unparsed.length > 0) {
      leftovers.push({
        imageUri: read.imageUri,
        isTyped: read.isTyped,
        text: unparsed.join("\n\n"),
      });
    }
  }

  let modelIssue: string | undefined;
  const unreadSegments: string[] = [];
  for (const leftover of leftovers) {
    // The cloud is used only when the on-device model can't run (or when the
    // user asks), so cut-off screenshot fragments aren't sent off the phone by default.
    const onDevice = options.forceCloud
      ? { issue: "skipped" }
      : await extractOnDevice(leftover.text);
    let found = onDevice.transactions;
    let reader: CaptureReader = "on-device";
    // Something the user typed on purpose gets a second opinion when the
    // on-device model finds nothing in it.
    if (!found || (leftover.isTyped && found.length === 0)) {
      const cloud = await extractInCloud(leftover.text, options.cloud);
      reader = "cloud";
      found = cloud.transactions;
      if (!found) {
        modelIssue = [onDevice.issue, cloud.issue].filter(Boolean).join("; ");
      }
    }
    if (!found?.length) {
      unreadSegments.push(leftover.text);
      continue;
    }
    for (const transaction of found) {
      add(transaction, reader, leftover.imageUri);
    }
  }

  // Own-account transfers absorb their incoming leg from the same capture.
  const resolved = resolveTransfers(
    transactions.map((item) => item.transaction),
    options.ownerNames ?? []
  );
  const readerByRef = new Map(
    transactions.map((item) => [item.transaction.externalRef, item])
  );
  const finalTransactions: CapturedTransaction[] = resolved.map(
    (transaction) => {
      const original = readerByRef.get(transaction.externalRef);
      return {
        reader: original?.reader ?? "pattern",
        sourceImageUri: original?.sourceImageUri,
        transaction,
      };
    }
  );

  const [firstRead] = reads;
  return {
    modelIssue,
    referenceDate: firstRead?.referenceDate ?? new Date(),
    sourceText: reads.map((read) => read.text).join("\n\n"),
    transactions: finalTransactions,
    unreadSegments,
  };
};
