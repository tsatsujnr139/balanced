import type { Transaction } from './types';

export function filterTransactions(transactions: Transaction[], query: string): Transaction[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return transactions;
  }

  return transactions.filter(
    (txn) =>
      txn.merchant.toLowerCase().includes(normalized) ||
      txn.category.toLowerCase().includes(normalized) ||
      txn.accountName.toLowerCase().includes(normalized) ||
      txn.createdByName.toLowerCase().includes(normalized) ||
      txn.tags.some((tag) => tag.name.toLowerCase().includes(normalized))
  );
}
