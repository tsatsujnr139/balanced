import { matchesWalletBank } from "../../../convex/lib/capture/banks";
import type { CapturedTransfer } from "../../../convex/lib/capture/transfers";
import type { Account } from "../finance/types";

const GHANAPAY_ACCOUNT = /\bghana\s*pay\b/i;

const MOMO_ACCOUNT = /\bmomo\b|\bmtn\b|\bmobile\s*money\b/i;

const NAME_WORD = /\p{L}{3,}/gu;

const nameWords = (value: string): string[] =>
  value.toLocaleLowerCase().match(NAME_WORD) ?? [];

/**
 * Narrows several equally good accounts (e.g. "Tsatsu's Momo" and "Vicki's
 * Momo") to the ones named after the person using this phone.
 */
export const preferOwnerAccounts = (
  candidates: Account[],
  ownerNames: string[]
): Account[] => {
  if (candidates.length < 2) {
    return candidates;
  }
  const owners = new Set(ownerNames.flatMap(nameWords));
  if (owners.size === 0) {
    return candidates;
  }
  const owned = candidates.filter((account) =>
    nameWords(account.name).some((word) => owners.has(word))
  );
  return owned.length > 0 ? owned : candidates;
};

const isMomoTransaction = (transaction: CapturedTransfer): boolean =>
  transaction.provider === "mtn_momo" ||
  (transaction.provider === "other" &&
    MOMO_ACCOUNT.test(transaction.institution ?? ""));

/** Avoid guessing when several accounts match the same wallet or bank. */
export const matchCaptureAccounts = (
  transaction: CapturedTransfer,
  accounts: Account[],
  ownerNames: string[] = []
) => {
  const momoSources = isMomoTransaction(transaction)
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
  const sources = preferOwnerAccounts(momoSources, ownerNames);
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
  fallbackId: string | null,
  ownerNames: string[] = []
): string | null => {
  const matching = accounts.filter(
    (account) =>
      account.currency === transaction.currency &&
      (!isMomoTransaction(transaction) ||
        (account.type !== "cash" &&
          MOMO_ACCOUNT.test(`${account.name} ${account.institution}`)))
  );
  // An account the user picked before always wins.
  if (matching.some((account) => account.id === rememberedId)) {
    return rememberedId ?? null;
  }
  const candidates = preferOwnerAccounts(matching, ownerNames);
  if (candidates.some((account) => account.id === fallbackId)) {
    return fallbackId;
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
