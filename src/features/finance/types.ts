export type AccountType =
  | "general"
  | "cash"
  | "current"
  | "savings"
  | "investment";

export interface Account {
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
}

export type TransactionDirection = "inflow" | "outflow";

export interface TransactionTag {
  id: string;
  name: string;
  color: string;
}

export type TransactionKind =
  | "expense"
  | "income"
  | "transfer_out"
  | "transfer_in"
  | "charge";

export interface Transaction {
  id: string;
  accountId: string;
  accountName: string;
  merchant: string;
  category: string;
  /** Signed amount in minor units (cents). Negative = outflow. */
  amount: number;
  currency: string;
  /** ISO timestamp. */
  date: string;
  symbol: string;
  color: string;
  /** Name snapshot of the profile when this transaction was created. */
  createdByName: string;
  tags: TransactionTag[];
  transactionKind?: TransactionKind;
  transactionChargeAmount?: number | null;
  parentTransactionId?: string;
  fromAccountId?: string;
  fromAccountName?: string;
  toAccountId?: string;
  toAccountName?: string;
}

export type TransactionTemplateType = "expense" | "income" | "transfer";

export interface TransactionTemplate {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  merchant: string;
  category: string;
  /** Positive amount in minor units (cents); sign is derived from type. */
  amount: number;
  type: TransactionTemplateType;
  currency: string;
  symbol: string;
  color: string;
  toAccountId: string | null;
  toAccountName: string | null;
  transactionCharge: number | null;
  tags: TransactionTag[];
}

export type BudgetPeriod = "weekly" | "monthly" | "yearly" | "one_time";

export interface Budget {
  id: string;
  name: string;
  /** Spent so far in minor units (cents). */
  spent: number;
  /** Budget limit in minor units (cents). */
  limit: number;
  currency: string;
  symbol: string;
  color: string;
  /** How often the budget resets. */
  period: BudgetPeriod;
  /** Category whose transactions count against this budget. */
  category: string | null;
  /** Optional tag association. */
  tagId: string | null;
  /** In-app notification when spending exceeds the limit. */
  notifyOnOverspend: boolean;
  /** In-app notification when spending crosses 75% of the limit. */
  notifyAtThreshold: boolean;
}

export type PlannedPaymentFrequency = "once" | "weekly" | "monthly" | "yearly";

export type PlannedPaymentType = "expense" | "income";

export type PlannedPaymentDueStatus =
  | "overdue"
  | "today"
  | "upcoming"
  | "completed";

export interface PlannedPayment {
  id: string;
  name: string;
  description: string;
  accountId: string;
  accountName: string;
  category: string;
  symbol: string;
  color: string;
  /** Positive amount in minor units (cents). */
  amount: number;
  type: PlannedPaymentType;
  currency: string;
  frequency: PlannedPaymentFrequency;
  interval: number;
  /** ISO timestamp of the earliest pending occurrence, or null when completed. */
  nextDueDate: string | null;
  /** Whole days until the next due date (negative when overdue). */
  daysUntilDue: number | null;
  /** Number of pending occurrences already past their due date. */
  overdueCount: number;
  dueStatus: PlannedPaymentDueStatus;
  notifyOnDue: boolean;
  notifyOnOverdue: boolean;
  tags: TransactionTag[];
}

export type PlannedPaymentOccurrenceStatus = "pending" | "paid" | "skipped";

export interface PlannedPaymentOccurrence {
  /** ISO timestamp of the occurrence's due date. */
  dueDate: string;
  status: PlannedPaymentOccurrenceStatus;
  /** ISO timestamp it was paid, when status is 'paid'. */
  paidDate: string | null;
  /** Signed amount in minor units (cents). */
  amount: number;
  /** Whole days until due (negative when overdue). */
  daysUntilDue: number;
}

export interface PlannedPaymentDetail {
  id: string;
  name: string;
  description: string;
  accountId: string;
  accountName: string;
  category: string;
  symbol: string;
  color: string;
  amount: number;
  type: PlannedPaymentType;
  currency: string;
  frequency: PlannedPaymentFrequency;
  interval: number;
  startDate: string;
  notifyOnDue: boolean;
  notifyOnOverdue: boolean;
  overdueCount: number;
  tags: TransactionTag[];
  occurrences: PlannedPaymentOccurrence[];
}

export interface FinanceSnapshot {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  /** Total pending overdue planned-payment occurrences across all payments. */
  plannedPaymentsOverdueCount: number;
}
