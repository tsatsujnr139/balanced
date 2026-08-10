import { createContext, useContext } from "react";

import type { TransactionCategory } from "./transaction-categories";
import type { AutomaticRuleType, TransactionTag } from "./types";

interface AddAutomaticRuleContextValue {
  category: TransactionCategory | null;
  isLoadingExisting: boolean;
  isSubmitting: boolean;
  matchTextInput: string;
  matchTexts: string[];
  name: string;
  tagColorDraft: string;
  tags: TransactionTag[];
  type: AutomaticRuleType;
  addMatchText: (value: string) => void;
  removeMatchText: (value: string) => void;
  setCategory: (category: TransactionCategory | null) => void;
  setMatchTextInput: (value: string) => void;
  setName: (value: string) => void;
  setTagColorDraft: (color: string) => void;
  setType: (type: AutomaticRuleType) => void;
  submit: () => void;
  toggleTag: (tag: TransactionTag) => void;
}

export const AddAutomaticRuleContext =
  createContext<AddAutomaticRuleContextValue | null>(null);

export const useAddAutomaticRule = (): AddAutomaticRuleContextValue => {
  const context = useContext(AddAutomaticRuleContext);
  if (!context) {
    throw new Error(
      "useAddAutomaticRule must be used inside AddAutomaticRuleContext.Provider"
    );
  }
  return context;
};
