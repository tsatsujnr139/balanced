import { createContext, useContext } from "react";

import type { BalanceContinuity } from "@/convex/lib/capture/parser";

import type { CapturedTransaction } from "./parse-capture";

export interface CaptureImage {
  mimeType?: string;
  name: string;
  uri: string;
}

export interface CaptureDraft {
  accountId: string | null;
  captured: CapturedTransaction;
  continuity: BalanceContinuity;
  /** Epoch millis. */
  date: number;
  /** Same as the transaction's external ref. */
  key: string;
  selected: boolean;
}

export interface CaptureContextValue {
  /** External refs of drafts that are already saved as transactions. */
  alreadyAdded: ReadonlySet<string>;
  drafts: CaptureDraft[];
  images: CaptureImage[];
  isSaving: boolean;
  setDraftAccount: (key: string, accountId: string) => void;
  setDrafts: (drafts: CaptureDraft[]) => void;
  setImages: (images: CaptureImage[]) => void;
  setText: (text: string) => void;
  text: string;
  toggleDraft: (key: string) => void;
}

export const CaptureContext = createContext<CaptureContextValue | null>(null);

export const useCapture = (): CaptureContextValue => {
  const value = useContext(CaptureContext);
  if (!value) {
    throw new Error("useCapture must be used inside the capture layout");
  }
  return value;
};
