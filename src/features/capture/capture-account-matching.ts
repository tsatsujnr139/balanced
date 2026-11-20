import { matchesWalletBank } from "../../../convex/lib/capture/banks";
import type { CapturedTransfer } from "../../../convex/lib/capture/transfers";
import type { Account } from "../finance/types";

const GHANAPAY_ACCOUNT = /\bghana\s*pay\b/i;

const MOMO_ACCOUNT = /\bmomo\b|\bmtn\b|\bmobile\s*money\b/i;

const isMomoTransaction = (transaction: CapturedTransfer): boolean =>
  transaction.provider === "mtn_momo" ||
  (transaction.provider === "other" &&
    MOMO_ACCOUNT.test(transaction.institution ?? ""));

/** Avoid guessing when several accounts match the same wallet or bank. */
export const matchCaptureAccounts = (
  transaction: CapturedTransfer,
  accounts: Account[]
) => {
  const sources = isMomoTransaction(transaction)
    ? accounts.filter(
        (account) =>
          account.currency === transaction.currency &&
          account.type !== "cash" &&
          MOMO_ACCOUNT.test(`${account.name} ${account.institution}`)
      )
    : [];
  const destinations =
    transaction.transfer?.kind === "Wallet2Bank"
      ? accounts.filter(
          (account) =>
            account.currency ===
              (transaction.transfer?.toCurrency ?? transaction.currency) &&
            matchesWalletBank(
              transaction.transfer?.destinationHint ?? "",
              `${account.name} ${account.institution}`
            )
        )
      : transaction.transfer &&
          GHANAPAY_ACCOUNT.test(transaction.transfer.destinationHint ?? "")
        ? accounts.filter(
            (account) =>
              account.currency === transaction.currency &&
              GHANAPAY_ACCOUNT.test(`${account.name} ${account.institution}`)
          )
        : [];
  return {
    sourceId: sources.length === 1 ? sources[0]?.id : undefined,
    destinationIds: destinations.map((account) => account.id),
  };
};

/** Provider evidence beats stale preferences or the generic Cash fallback. */
export const pickCaptureSourceAccountId = (
  transaction: CapturedTransfer,
  accounts: Account[],
  rememberedId: string | undefined,
  fallbackId: string | null
): string | null => {
  const candidates = accounts.filter(
    (account) =>
      account.currency === transaction.currency &&
      (!isMomoTransaction(transaction) ||
        (account.type !== "cash" &&
          MOMO_ACCOUNT.test(`${account.name} ${account.institution}`)))
  );
  for (const id of [rememberedId, fallbackId]) {
    if (candidates.some((account) => account.id === id)) {
      return id ?? null;
    }
  }
  if (isMomoTransaction(transaction) && candidates.length !== 1) {
    return null;
  }
  return candidates[0]?.id ?? null;
};

export const hasSpecificCaptureDestination = (
  transaction: CapturedTransfer
): boolean =>
  transaction.transfer?.kind === "Wallet2Bank" ||
  Boolean(
    transaction.transfer &&
    GHANAPAY_ACCOUNT.test(transaction.transfer.destinationHint ?? "")
  );
