import type {
  TransactionAttachmentDraft,
  TransactionTag,
} from "./add-transaction-context";
import type { TransactionCategory } from "./transaction-categories";

export interface TransactionDraftPrefill {
  accountId: string | null;
  amount: string;
  attachments: TransactionAttachmentDraft[];
  category: string | null;
  customCategories: TransactionCategory[];
  date: number;
  narration: string;
  tags: TransactionTag[];
  toAccountId: string | null;
  transactionCharge: string;
  transactionTypeIndex: number;
}

const transactionDraftPrefillById = new Map<string, TransactionDraftPrefill>();

export function setTransactionDraftPrefill(
  id: string,
  prefill: TransactionDraftPrefill
): void {
  transactionDraftPrefillById.set(id, prefill);
}

export function getTransactionDraftPrefill(
  id: string
): TransactionDraftPrefill | undefined {
  return transactionDraftPrefillById.get(id);
}

export function clearTransactionDraftPrefill(id: string): void {
  transactionDraftPrefillById.delete(id);
}
