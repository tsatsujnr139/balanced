import type { AccountType } from './types';

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  general: 'General',
  cash: 'Cash',
  current: 'Current',
  savings: 'Savings',
  investment: 'Investment',
};

export const ACCOUNT_TYPE_SYMBOL: Record<AccountType, string> = {
  general: 'wallet.pass.fill',
  cash: 'banknote.fill',
  current: 'building.columns.fill',
  savings: 'tray.full.fill',
  investment: 'chart.line.uptrend.xyaxis',
};

export const DEFAULT_ACCOUNT_COLOR = '#34C7B5';

export const ACCOUNT_TYPES = ['general', 'cash', 'current', 'savings', 'investment'] as const;

export const ACCOUNT_CURRENCIES = ['USD', 'EUR', 'GBP', 'GHS'] as const;

export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number];

export const ACCOUNT_CURRENCY_LABEL: Record<AccountCurrency, string> = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  GHS: 'Ghanaian Cedi',
};

/** Color families ordered light → medium → dark within each row. */
export const ACCOUNT_COLOR_GROUPS = [
  { id: 'teal', colors: ['#99F6E4', '#34C7B5', '#0F766E'] },
  { id: 'blue', colors: ['#BFDBFE', '#007AFF', '#1E3A8A'] },
  { id: 'sky', colors: ['#BAE6FD', '#2F6BFF', '#1D4ED8'] },
  { id: 'green', colors: ['#86EFAC', '#16A34A', '#14532D'] },
  { id: 'lime', colors: ['#D9F99D', '#30D158', '#3F6212'] },
  { id: 'yellow', colors: ['#FEF08A', '#FACC15', '#A16207'] },
  { id: 'amber', colors: ['#FDE68A', '#F59E0B', '#B45309'] },
  { id: 'orange', colors: ['#FED7AA', '#FF6B00', '#C2410C'] },
  { id: 'red', colors: ['#FCA5A5', '#DC2626', '#991B1B'] },
  { id: 'rose', colors: ['#FECDD3', '#F43F5E', '#9F1239'] },
  { id: 'pink', colors: ['#FBCFE8', '#EC4899', '#9D174D'] },
  { id: 'purple', colors: ['#D8B4FE', '#9333EA', '#581C87'] },
  { id: 'indigo', colors: ['#C7D2FE', '#6366F1', '#3730A3'] },
  { id: 'brown', colors: ['#E7D4C4', '#A2845E', '#5C4033'] },
  { id: 'grey', colors: ['#E5E7EB', '#8E8E93', '#374151'] },
] as const;

export const ACCOUNT_COLOR_OPTIONS = ACCOUNT_COLOR_GROUPS.flatMap((group) => [...group.colors]);
