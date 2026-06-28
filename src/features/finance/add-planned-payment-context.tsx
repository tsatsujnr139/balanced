import { createContext, useContext } from 'react';

import type { PlannedPaymentFrequency, PlannedPaymentType } from './types';

export type PlannedCategorySelection = {
  name: string;
  symbol: string;
  color: string;
};

export type PlannedTagSelection = {
  id: string;
  name: string;
  color: string;
};

type AddPlannedPaymentContextValue = {
  type: PlannedPaymentType;
  amount: string;
  name: string;
  description: string;
  accountId: string | null;
  category: PlannedCategorySelection | null;
  date: number;
  frequency: PlannedPaymentFrequency;
  interval: number;
  tags: PlannedTagSelection[];
  notifyOnDue: boolean;
  notifyOnOverdue: boolean;
  isSubmitting: boolean;
  isEditing: boolean;
  setType: (type: PlannedPaymentType) => void;
  setAmount: (amount: string) => void;
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setAccountId: (accountId: string) => void;
  setCategory: (category: PlannedCategorySelection) => void;
  setDate: (date: number) => void;
  setFrequency: (frequency: PlannedPaymentFrequency) => void;
  setInterval: (interval: number) => void;
  toggleTag: (tag: PlannedTagSelection) => void;
  setNotifyOnDue: (value: boolean) => void;
  setNotifyOnOverdue: (value: boolean) => void;
  submit: () => void;
};

export const AddPlannedPaymentContext = createContext<AddPlannedPaymentContextValue | null>(null);

export function useAddPlannedPayment() {
  const context = useContext(AddPlannedPaymentContext);

  if (!context) {
    throw new Error('useAddPlannedPayment must be used inside AddPlannedPaymentContext.Provider');
  }

  return context;
}
