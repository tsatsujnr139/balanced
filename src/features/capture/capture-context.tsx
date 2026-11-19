import { createContext, useContext } from "react";

import type { BalanceContinuity } from "@/convex/lib/capture/parser";

import type { CapturedTransaction } from "./parse-capture";

export interface CaptureImage {
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
}

export interface CaptureContextValue {
  /** External refs of drafts that are already saved as transactions. */
  alreadyAdded: ReadonlySet<string>;
  drafts: CaptureDraft[];
  images: CaptureImage[];
  isSaving: boolean;
  setDraftAccount: (key: string, accountId: string) => void;
  setDraftCategory: (key: string, category: CaptureCategory) => void;
  setDrafts: (
    drafts: CaptureDraft[] | ((current: CaptureDraft[]) => CaptureDraft[])
  ) => void;
  setImages: (images: CaptureImage[]) => void;
  setText: (text: string) => void;
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
