import type { Transaction } from "./types";

export const MAX_TRANSACTION_DESCRIPTION_SUGGESTIONS = 5;

function normalizeDescription(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function isChargeTransaction(transaction: Transaction): boolean {
  return (
    transaction.transactionKind === "charge" ||
    transaction.category === "Transaction charges"
  );
}

export function getTransactionDescriptionSuggestions(
  transactions: Transaction[],
  query: string,
  limit = MAX_TRANSACTION_DESCRIPTION_SUGGESTIONS
): string[] {
  const normalizedQuery = normalizeDescription(query);
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const transaction of transactions) {
    if (isChargeTransaction(transaction)) {
      continue;
    }

    const description = transaction.merchant.trim();
    const normalizedDescription = normalizeDescription(description);

    if (
      !description ||
      seen.has(normalizedDescription) ||
      normalizedDescription === normalizedQuery ||
      (normalizedQuery && !normalizedDescription.includes(normalizedQuery))
    ) {
      continue;
    }

    seen.add(normalizedDescription);
    suggestions.push(description);

    if (suggestions.length >= limit) {
      break;
    }
  }

  return suggestions;
}
