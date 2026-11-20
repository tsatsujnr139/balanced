import { createContext, useContext } from "react";

import type { BalanceContinuity } from "@/convex/lib/capture/parser";

import type { TransactionAttachmentDraft } from "../finance/add-transaction-context";
import type { TransactionDraftPrefill } from "../finance/transaction-draft-prefill";
import type { CapturedTransaction } from "./parse-capture";

/** Most screenshots one capture reads. */
export const MAX_CAPTURE_IMAGES = 5;

export interface CaptureImage {
  /** When the screenshot was taken, from the photo's metadata. */
  capturedAt?: number;
  mimeType?: string;
  name: string;
  uri: string;
}

export interface CaptureCategory {
  color: string;
  name: string;
  symbol: string;
}

export interface CaptureTag {
  color: string;
  id: string;
  name: string;
}

/** Where a draft's category and tags came from. */
export type CaptureLabelSource = "ai" | "history" | "manual" | "rule";

export interface CaptureDraft {
  attachments?: TransactionAttachmentDraft[];
  accountId: string | null;
  /** Null leaves the category to automatic rules (or Uncategorized). */
  category: CaptureCategory | null;
  captured: CapturedTransaction;
  continuity: BalanceContinuity;
  /** Epoch millis. */
  date: number;
  /** Same as the transaction's external ref. */
  key: string;
  labelSource?: CaptureLabelSource;
  selected: boolean;
  tags: CaptureTag[];
  /** Destination account for transfers; null means "Out of wallet". */
  toAccountId: string | null;
}

export interface CaptureContextValue {
  /** External refs of drafts that are already saved as transactions. */
  alreadyAdded: ReadonlySet<string>;
  applyDraftForm: (key: string, form: TransactionDraftPrefill) => void;
  drafts: CaptureDraft[];
  images: CaptureImage[];
  isSaving: boolean;
  setDraftAccount: (key: string, accountId: string) => void;
  /** Account chosen for the whole capture; null detects it per message. */
  setSourceAccountId: (accountId: string | null) => void;
  setDraftToAccount: (key: string, accountId: string | null) => void;
  setDraftCategory: (key: string, category: CaptureCategory) => void;
  setDrafts: (
    drafts: CaptureDraft[] | ((current: CaptureDraft[]) => CaptureDraft[])
  ) => void;
  setImages: (images: CaptureImage[]) => void;
  setText: (text: string) => void;
  sourceAccountId: string | null;
  text: string;
  toggleDraft: (key: string) => void;
  toggleDraftTag: (key: string, tag: CaptureTag) => void;
}

export const CaptureContext = createContext<CaptureContextValue | null>(null);

export const useCapture = (): CaptureContextValue => {
  const value = useContext(CaptureContext);
  if (!value) {
    throw new Error("useCapture must be used inside the capture layout");
  }
  return value;
};
