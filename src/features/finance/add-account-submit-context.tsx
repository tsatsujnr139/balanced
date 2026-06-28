import { createContext, useContext } from 'react';

import type { AccountType } from './types';

export type AccountBalanceUpdateMode = 'record' | 'initial';

type AddAccountSubmitContextValue = {
  accountColor: string;
  balanceInput: string;
  balanceUpdateMode: AccountBalanceUpdateMode;
  currency: string;
  isSubmitting: boolean;
  name: string;
  registerSubmit: (submit: (() => Promise<void>) | null) => void;
  setAccountColor: (color: string) => void;
  setBalanceInput: (balance: string) => void;
  setBalanceUpdateMode: (mode: AccountBalanceUpdateMode) => void;
  setCurrency: (currency: string) => void;
  setName: (name: string) => void;
  setType: (type: AccountType) => void;
  submit: () => void;
  type: AccountType;
};

export const AddAccountSubmitContext = createContext<AddAccountSubmitContextValue | null>(null);

export function useAddAccountSubmit() {
  const context = useContext(AddAccountSubmitContext);

  if (!context) {
    throw new Error('useAddAccountSubmit must be used inside AddAccountSubmitContext.Provider');
  }

  return context;
}
