import { createContext, useContext } from "react";

interface PlannedPaymentSummaryContextValue {
  accountId: string | null;
  amount: string;
  isSubmitting: boolean;
  paymentDate: number;
  setAccountId: (accountId: string) => void;
  setAmount: (amount: string) => void;
  setPaymentDate: (date: number) => void;
  submit: () => void;
}

export const PlannedPaymentSummaryContext =
  createContext<PlannedPaymentSummaryContextValue | null>(null);

export function usePlannedPaymentSummary() {
  const context = useContext(PlannedPaymentSummaryContext);

  if (!context) {
    throw new Error(
      "usePlannedPaymentSummary must be used inside PlannedPaymentSummaryContext.Provider"
    );
  }

  return context;
}
