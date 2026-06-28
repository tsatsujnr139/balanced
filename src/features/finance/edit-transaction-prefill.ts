import type { TransactionTag } from "./add-transaction-context";
import { TRANSACTION_CATEGORIES } from "./transaction-categories";
import type { TransactionCategory } from "./transaction-categories";
import type { Transaction } from "./types";

const prefillById = new Map<string, Transaction>();

export function setTransactionEditPrefill(transaction: Transaction) {
  prefillById.set(transaction.id, transaction);
}

export function getTransactionEditPrefill(id: string): Transaction | undefined {
  return prefillById.get(id);
}

export function clearTransactionEditPrefill(id: string) {
  prefillById.delete(id);
}

export interface TransactionEditFormState {
  accountId: string;
  amount: string;
  category: string;
  customCategories: TransactionCategory[];
  date: number;
  narration: string;
  tags: TransactionTag[];
  toAccountId: string | null;
  transactionCharge: string;
  transactionTypeIndex: number;
}

function minorUnitsToAmountInput(value: number): string {
  return (Math.abs(value) / 100).toFixed(2);
}

function isTransferTransaction(transaction: Transaction): boolean {
  return (
    transaction.transactionKind === "transfer_out" ||
    transaction.transactionKind === "transfer_in" ||
    transaction.category.toLowerCase() === "transfer"
  );
}

export function buildEditFormState(
  transaction: Transaction
): TransactionEditFormState {
  const isTransfer = isTransferTransaction(transaction);
  const isDefaultMerchant = transaction.merchant === transaction.category;
  const isBuiltInCategory = TRANSACTION_CATEGORIES.some(
    (item) => item.name === transaction.category
  );

  return {
    accountId: isTransfer
      ? (transaction.fromAccountId ?? transaction.accountId)
      : transaction.accountId,
    amount: minorUnitsToAmountInput(transaction.amount),
    category: transaction.category,
    customCategories: isBuiltInCategory
      ? []
      : [
          {
            color: transaction.color,
            keywords: [],
            name: transaction.category,
            symbol: transaction.symbol,
          },
        ],
    date: new Date(transaction.date).getTime(),
    narration: isDefaultMerchant ? "" : transaction.merchant,
    tags: transaction.tags,
    toAccountId: isTransfer ? (transaction.toAccountId ?? null) : null,
    transactionCharge: transaction.transactionChargeAmount
      ? minorUnitsToAmountInput(transaction.transactionChargeAmount)
      : "",
    transactionTypeIndex: isTransfer ? 2 : transaction.amount >= 0 ? 1 : 0,
  };
}
