import { createContext, useContext } from "react";

import type { BudgetPeriod } from "./types";

export interface BudgetCategorySelection {
  name: string;
  symbol: string;
  color: string;
}

export interface BudgetTagSelection {
  id: string;
  name: string;
  color: string;
}

interface AddBudgetContextValue {
  amount: string;
  name: string;
  category: BudgetCategorySelection | null;
  period: BudgetPeriod;
  tags: BudgetTagSelection[];
  notifyOnOverspend: boolean;
  notifyAtThreshold: boolean;
  isSubmitting: boolean;
  setAmount: (amount: string) => void;
  setName: (name: string) => void;
  setCategory: (category: BudgetCategorySelection) => void;
  setPeriod: (period: BudgetPeriod) => void;
  setNotifyOnOverspend: (value: boolean) => void;
  setNotifyAtThreshold: (value: boolean) => void;
  submit: () => void;
  toggleTag: (tag: BudgetTagSelection) => void;
}

export const AddBudgetContext = createContext<AddBudgetContextValue | null>(
  null
);

export function useAddBudget() {
  const context = useContext(AddBudgetContext);

  if (!context) {
    throw new Error(
      "useAddBudget must be used inside AddBudgetContext.Provider"
    );
  }

  return context;
}
