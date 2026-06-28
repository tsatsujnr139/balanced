import { createContext, useContext } from "react";

import type { TransactionCategory } from "./transaction-categories";
import type { TransactionTemplate } from "./types";

export interface TransactionAttachmentDraft {
  id: string;
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export interface TransactionTag {
  color: string;
  id: string;
  name: string;
}

export interface TransactionLabelDraft {
  color: string;
  name: string;
  symbol: string;
}

interface AddTransactionContextValue {
  accountId: string | null;
  amount: string;
  attachments: TransactionAttachmentDraft[];
  category: string | null;
  date: number;
  labelDraft: TransactionLabelDraft;
  tags: TransactionTag[];
  toAccountId: string | null;
  transactionCharge: string;
  narration: string;
  transactionTypeIndex: number;
  customCategories: TransactionCategory[];
  addCustomCategory: (category: TransactionCategory) => void;
  addAttachments: (attachments: TransactionAttachmentDraft[]) => void;
  applyTemplate: (template: TransactionTemplate) => void;
  removeAttachment: (id: string) => void;
  setAccountId: (accountId: string) => void;
  setAmount: (amount: string) => void;
  setCategory: (category: string) => void;
  setDate: (date: number) => void;
  setLabelDraft: (
    draft:
      | TransactionLabelDraft
      | ((current: TransactionLabelDraft) => TransactionLabelDraft)
  ) => void;
  setToAccountId: (accountId: string) => void;
  setTransactionCharge: (transactionCharge: string) => void;
  setNarration: (narration: string) => void;
  setTransactionTypeIndex: (index: number) => void;
  toggleTag: (tag: TransactionTag) => void;
}

export const AddTransactionContext =
  createContext<AddTransactionContextValue | null>(null);

export function useAddTransaction() {
  const context = useContext(AddTransactionContext);

  if (!context) {
    throw new Error(
      "useAddTransaction must be used inside AddTransactionContext.Provider"
    );
  }

  return context;
}
