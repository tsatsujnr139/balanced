import { matchesWalletBank } from "../../../convex/lib/capture/banks";
import type { CaptureProvider } from "../../../convex/lib/capture/parser";
import type { CapturedTransfer } from "../../../convex/lib/capture/transfers";
import type { Account } from "../finance/types";

const GHANAPAY_ACCOUNT = /\bghana\s*pay\b/i;

const MOMO_ACCOUNT = /\bmomo\b|\bmtn\b|\bmobile\s*money\b/i;

const FNB_ACCOUNT = /\bfnb\b|\bfirst\s*national\b|\bfirnatbank\b/i;

/** A typed note like "Groundnuts 20 cash" (not "Telecel Cash"). */
const CASH_INSTITUTION = /^\s*cash\s*$/i;

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

/** Tests whether an account can have sent a notification. */
type SourceKind = (account: Account) => boolean;

const namedAccount =
  (pattern: RegExp): SourceKind =>
  (account) =>
    account.type !== "cash" &&
    pattern.test(`${account.name} ${account.institution}`);

const MOMO_KIND = namedAccount(MOMO_ACCOUNT);
const GHANAPAY_KIND = namedAccount(GHANAPAY_ACCOUNT);
const FNB_KIND = namedAccount(FNB_ACCOUNT);
const CASH_KIND: SourceKind = (account) => account.type === "cash";

const PROVIDER_KINDS: Partial<Record<CaptureProvider, SourceKind>> = {
  fnb: FNB_KIND,
  ghanapay: GHANAPAY_KIND,
  mtn_momo: MOMO_KIND,
};

/** What a model-read notification (or typed note) names as the account. */
const INSTITUTION_KINDS: [RegExp, SourceKind][] = [
  [MOMO_ACCOUNT, MOMO_KIND],
  [GHANAPAY_ACCOUNT, GHANAPAY_KIND],
  [FNB_ACCOUNT, FNB_KIND],
  [CASH_INSTITUTION, CASH_KIND],
];

const sourceKind = (transaction: CapturedTransfer): SourceKind | undefined =>
  transaction.provider === "other"
    ? INSTITUTION_KINDS.find(([pattern]) =>
        pattern.test(transaction.institution ?? "")
      )?.[1]
    : PROVIDER_KINDS[transaction.provider];

/** Accounts that could have sent this notification, best first. */
const sourceCandidates = (
  transaction: CapturedTransfer,
  accounts: Account[],
  ownerNames: string[]
): {
  candidates: Account[];
  matching: Account[];
  /** True when the notification names a specific kind of account. */
  strict: boolean;
} => {
  const kind = sourceKind(transaction);
  const matching = accounts.filter(
    (account) =>
      account.currency === transaction.currency && (!kind || kind(account))
  );
  return {
    candidates: preferOwnerAccounts(matching, ownerNames),
    matching,
    strict: kind !== undefined,
  };
};

/** Avoid guessing when several accounts match the same wallet or bank. */
export const matchCaptureAccounts = (
  transaction: CapturedTransfer,
  accounts: Account[],
  ownerNames: string[] = []
) => {
  const source = sourceCandidates(transaction, accounts, ownerNames);
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
    sourceId:
      source.strict && source.candidates.length === 1
        ? source.candidates[0]?.id
        : undefined,
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
  const { candidates, matching, strict } = sourceCandidates(
    transaction,
    accounts,
    ownerNames
  );
  // An account the user picked before always wins.
  if (matching.some((account) => account.id === rememberedId)) {
    return rememberedId ?? null;
  }
  if (candidates.some((account) => account.id === fallbackId)) {
    return fallbackId;
  }
  // A GhanaPay message never belongs to the bank account used last time.
  if (strict && candidates.length !== 1) {
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
