/**
 * Turns captured debits into transfers between the user's own accounts and
 * pairs them with the matching incoming leg from the same capture.
 */

import type { CaptureDateTime, ParsedCaptureTransaction } from "./parser";

/** Counterparties that are always the user's own wallet top-ups. */
const OWN_WALLET_COUNTERPARTIES = [/\bghanapay push\b/i];
const NAME_WORD = /\p{L}{3,}/gu;
const MS_PER_MINUTE = 60_000;
/** Incoming legs can land up to this long after the outgoing one. */
const PAIRING_WINDOW_MS = 3 * 24 * 60 * MS_PER_MINUTE;

export interface PairedLeg {
  accountSuffix?: string;
  externalRef: string;
  institution?: string;
  provider: ParsedCaptureTransaction["provider"];
}

export type CapturedTransfer = ParsedCaptureTransaction & {
  /** The incoming leg found in the same capture, if any. */
  pairedLeg?: PairedLeg;
};

const nameWords = (value: string): string[] =>
  value.toLocaleLowerCase().match(NAME_WORD) ?? [];

/** True when the counterparty name contains one of the owner's names. */
export const isOwnerName = (
  counterparty: string | undefined,
  ownerNames: string[]
): boolean => {
  if (!counterparty) {
    return false;
  }
  const words = new Set(nameWords(counterparty));
  return ownerNames
    .flatMap(nameWords)
    .some((ownerWord) => words.has(ownerWord));
};

const toEpoch = (value: CaptureDateTime | undefined): number | undefined =>
  value
    ? new Date(
        value.year,
        value.month - 1,
        value.day,
        value.hour,
        value.minute,
        value.second
      ).getTime()
    : undefined;

const withinWindow = (
  outgoing: ParsedCaptureTransaction,
  incoming: ParsedCaptureTransaction
): boolean => {
  const sent = toEpoch(outgoing.occurredAt);
  const received = toEpoch(incoming.occurredAt);
  if (sent === undefined || received === undefined) {
    return true;
  }
  return (
    received >= sent - MS_PER_MINUTE * 5 && received - sent <= PAIRING_WINDOW_MS
  );
};

const classify = (
  transaction: ParsedCaptureTransaction,
  ownerNames: string[]
): ParsedCaptureTransaction => {
  if (transaction.direction !== "debit") {
    return transaction;
  }
  // Exchange orders are always money moving between the user's own accounts.
  if (transaction.institution === "Bybit") {
    return transaction;
  }
  const counterparty = transaction.counterpartyName ?? "";
  const isOwn =
    isOwnerName(counterparty, ownerNames) ||
    OWN_WALLET_COUNTERPARTIES.some((pattern) => pattern.test(counterparty));
  if (isOwn) {
    return {
      ...transaction,
      transfer: {
        ...transaction.transfer,
        destinationHint: transaction.transfer?.destinationHint ?? counterparty,
      },
    };
  }
  // Paying someone else (even across currencies) is spending, not a transfer.
  const { transfer: _transfer, ...spending } = transaction;
  return spending;
};

/**
 * Marks own-account transfers and folds each transfer's incoming leg (same
 * currency and amount received, within a few days) into it.
 */
export const resolveTransfers = (
  transactions: ParsedCaptureTransaction[],
  ownerNames: string[]
): CapturedTransfer[] => {
  const classified = transactions.map((transaction) =>
    classify(transaction, ownerNames)
  );
  const consumed = new Set<string>();
  const pairedLegByRef = new Map<string, PairedLeg>();

  for (const transaction of classified) {
    if (!transaction.transfer) {
      continue;
    }
    const receivedCurrency =
      transaction.transfer.toCurrency ?? transaction.currency;
    const receivedAmount = transaction.transfer.toAmount ?? transaction.amount;
    const incoming = classified.find(
      (candidate) =>
        !consumed.has(candidate.externalRef) &&
        candidate.direction === "credit" &&
        !candidate.transfer &&
        candidate.currency === receivedCurrency &&
        candidate.amount === receivedAmount &&
        candidate.provider !== transaction.provider &&
        withinWindow(transaction, candidate)
    );
    if (incoming) {
      consumed.add(incoming.externalRef);
      pairedLegByRef.set(transaction.externalRef, {
        accountSuffix: incoming.accountSuffix,
        externalRef: incoming.externalRef,
        institution: incoming.institution,
        provider: incoming.provider,
      });
    }
  }

  return classified
    .filter((transaction) => !consumed.has(transaction.externalRef))
    .map((transaction) => {
      const pairedLeg = pairedLegByRef.get(transaction.externalRef);
      return pairedLeg ? { ...transaction, pairedLeg } : transaction;
    });
};
