import { createContext, useContext } from "react";

import type { TransactionLabelDraft } from "@/features/finance/add-transaction-context";

interface AddCategoryContextValue {
  draft: TransactionLabelDraft;
  setDraft: (
    draft:
      | TransactionLabelDraft
      | ((current: TransactionLabelDraft) => TransactionLabelDraft)
  ) => void;
}

export const AddCategoryContext = createContext<AddCategoryContextValue | null>(
  null
);

export function useAddCategory() {
  const context = useContext(AddCategoryContext);

  if (!context) {
    throw new Error("useAddCategory must be used inside AddCategoryContext");
  }

  return context;
}
