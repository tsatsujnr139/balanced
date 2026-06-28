import { createContext, useContext } from "react";

import type { TransactionCategory } from "./transaction-categories";
import type { TransactionTag, TransactionTemplateType } from "./types";

interface AddTemplateContextValue {
  accountId: string | null;
  amount: string;
  category: TransactionCategory | null;
  isLoadingExisting: boolean;
  isSubmitting: boolean;
  merchant: string;
  name: string;
  tags: TransactionTag[];
  toAccountId: string | null;
  transactionCharge: string;
  type: TransactionTemplateType;
  setAccountId: (id: string | null) => void;
  setAmount: (amount: string) => void;
  setCategory: (category: TransactionCategory | null) => void;
  setMerchant: (merchant: string) => void;
  setName: (name: string) => void;
  setToAccountId: (id: string | null) => void;
  setTransactionCharge: (charge: string) => void;
  setType: (type: TransactionTemplateType) => void;
  submit: () => void;
  toggleTag: (tag: TransactionTag) => void;
}

export const AddTemplateContext = createContext<AddTemplateContextValue | null>(
  null
);

export function useAddTemplate() {
  const context = useContext(AddTemplateContext);

  if (!context) {
    throw new Error(
      "useAddTemplate must be used inside AddTemplateContext.Provider"
    );
  }

  return context;
}
