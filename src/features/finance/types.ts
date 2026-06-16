export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'cash';

export type Account = {
  id: string;
  name: string;
  institution: string;
  type: AccountType;
  /** Available balance in minor units (cents). */
  balance: number;
  currency: string;
  /** SF Symbol name used to represent the account. */
  symbol: string;
  /** Accent hex color for the account card. */
  color: string;
};

export type TransactionDirection = 'inflow' | 'outflow';

export type Transaction = {
  id: string;
  accountId: string;
  merchant: string;
  category: string;
  /** Signed amount in minor units (cents). Negative = outflow. */
  amount: number;
  currency: string;
  /** ISO timestamp. */
  date: string;
  symbol: string;
  color: string;
};

export type Budget = {
  id: string;
  name: string;
  /** Spent so far in minor units (cents). */
  spent: number;
  /** Budget limit in minor units (cents). */
  limit: number;
  currency: string;
  symbol: string;
  color: string;
};

export type FinanceSnapshot = {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
};
