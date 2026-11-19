/**
 * Validation of transactions extracted by an AI model (on-device Apple
 * Foundation Models or the OpenCode fallback). Shared by the app and Convex.
 *
 * Models can misread or invent numbers, so every amount must appear in the
 * source text and anything unverifiable is dropped rather than guessed.
 */

import { parseAmountToMinorUnits } from "./parser";
import type {
  CaptureDateTime,
  CaptureDirection,
  ParsedCaptureTransaction,
} from "./parser";

/** What a model returns per transaction; numbers are strings copied from the text. */
export interface ModelExtractedTransaction {
  amount: string;
  balanceAfter?: string;
  counterparty?: string;
  /** Currency code as printed, e.g. "GHS", "USD", "USDT". */
  currency?: string;
  direction: string;
  fee?: string;
  institution?: string;
  /** "YYYY-MM-DD HH:MM". */
  occurredAt?: string;
  reference?: string;
  sourceText?: string;
  summary?: string;
  transactionId?: string;
}

const NUMBER_IN_TEXT = /\d+(?:,\d{3})*(?:\.\d{1,2})?/g;
const MODEL_AMOUNT =
  /^\s*(?:GHS|GH₵|₵)?\s*(?<value>\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*$/i;
const MODEL_DATE_TIME =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})[ T](?<hour>\d{2}):(?<minute>\d{2})/;
const WHITESPACE = /\s+/g;
const DIRECTIONS = new Set<string>(["credit", "debit"]);
const CURRENCY_CODE = /^[A-Z]{3,4}$/;
const DEFAULT_CURRENCY = "GHS";

/**
 * Same ref prefixes as the fixed patterns, so a payment read by the AI from
 * one source and by a pattern from another is recognised as one transaction.
 */
const INSTITUTION_REF_PREFIXES: [RegExp, string][] = [
  [/\b(?:mtn|momo|mobile ?money)\b/i, "mtn_momo"],
  [/\bghana ?pay\b/i, "ghanapay"],
  [/\bwise\b/i, "wise"],
  [/\bgrey\b/i, "grey"],
  [/\bbybit\b/i, "bybit"],
];

const refPrefix = (institution: string | undefined): string =>
  INSTITUTION_REF_PREFIXES.find(([pattern]) =>
    pattern.test(institution ?? "")
  )?.[1] ?? "txn";
const MAX_MONTH = 12;
const MAX_DAY = 31;
const MAX_HOUR = 23;
const MAX_MINUTE = 59;

/** Every amount printed in the text, in minor units. */
const amountsInText = (text: string): Set<number> =>
  new Set(
    [...text.matchAll(NUMBER_IN_TEXT)].map(([value]) =>
      parseAmountToMinorUnits(value)
    )
  );

const parseModelAmount = (value: string | undefined): number | undefined => {
  const match = value ? MODEL_AMOUNT.exec(value) : null;
  // Positional, not `match.groups`, for consistent behaviour on Hermes.
  const amount = match?.[1];
  return amount === undefined ? undefined : parseAmountToMinorUnits(amount);
};

/** Keeps an amount only if it is printed in the source text. */
const verifiedAmount = (
  value: string | undefined,
  printed: Set<number>
): number | undefined => {
  const amount = parseModelAmount(value);
  return amount !== undefined && printed.has(amount) ? amount : undefined;
};

const parseModelDateTime = (
  value: string | undefined
): CaptureDateTime | undefined => {
  const match = value ? MODEL_DATE_TIME.exec(value.trim()) : null;
  if (!match) {
    return;
  }
  const [, year, month, day, hour, minute] = match;
  const dateTime: CaptureDateTime = {
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    month: Number(month),
    second: 0,
    year: Number(year),
  };
  const isValid =
    dateTime.month >= 1 &&
    dateTime.month <= MAX_MONTH &&
    dateTime.day >= 1 &&
    dateTime.day <= MAX_DAY &&
    dateTime.hour <= MAX_HOUR &&
    dateTime.minute <= MAX_MINUTE;
  return isValid ? dateTime : undefined;
};

const clean = (value: string | undefined): string | undefined => {
  const trimmed = value?.replace(WHITESPACE, " ").trim();
  return trimmed || undefined;
};

const pad = (value: number): string => String(value).padStart(2, "0");

const modelExternalRef = (transaction: {
  amount: number;
  balanceAfter?: number;
  direction: CaptureDirection;
  institution?: string;
  occurredAt?: CaptureDateTime;
  transactionId?: string;
}): string => {
  if (transaction.transactionId) {
    return `${refPrefix(transaction.institution)}:${transaction.transactionId}`;
  }
  const { occurredAt } = transaction;
  const when = occurredAt
    ? `${occurredAt.year}-${pad(occurredAt.month)}-${pad(occurredAt.day)}T${pad(occurredAt.hour)}:${pad(occurredAt.minute)}`
    : "";
  return [
    "model",
    transaction.institution?.toLocaleLowerCase() ?? "",
    transaction.direction,
    transaction.amount,
    transaction.balanceAfter ?? "",
    when,
  ].join(":");
};

/**
 * Converts model output into capture transactions, dropping any whose amount
 * or direction can't be verified against `sourceText`.
 */
export const normalizeModelTransactions = (
  items: ModelExtractedTransaction[],
  sourceText: string
): ParsedCaptureTransaction[] => {
  const printed = amountsInText(sourceText);
  const seenRefs = new Set<string>();
  const transactions: ParsedCaptureTransaction[] = [];

  for (const item of items) {
    const direction = item.direction?.trim().toLocaleLowerCase();
    const amount = verifiedAmount(item.amount, printed);
    if (!(amount && direction && DIRECTIONS.has(direction))) {
      continue;
    }

    const occurredAt = parseModelDateTime(item.occurredAt);
    const institution = clean(item.institution);
    const reference = clean(item.reference);
    const counterpartyName = clean(item.counterparty);
    const transactionId = clean(item.transactionId)?.replace(WHITESPACE, "");
    const balanceAfter = verifiedAmount(item.balanceAfter, printed);
    const typedDirection = direction as CaptureDirection;
    const externalRef = modelExternalRef({
      amount,
      balanceAfter,
      direction: typedDirection,
      institution,
      occurredAt,
      transactionId,
    });
    if (seenRefs.has(externalRef)) {
      continue;
    }
    seenRefs.add(externalRef);

    transactions.push({
      amount,
      balanceAfter,
      counterpartyName,
      currency:
        item.currency && CURRENCY_CODE.test(item.currency.trim().toUpperCase())
          ? item.currency.trim().toUpperCase()
          : DEFAULT_CURRENCY,
      description:
        clean(item.summary) ?? reference ?? counterpartyName ?? "Transaction",
      direction: typedDirection,
      externalRef,
      fee: verifiedAmount(item.fee, printed) ?? 0,
      institution,
      occurredAt,
      occurredAtSource: occurredAt ? "message" : undefined,
      provider: "other",
      reference,
      sourceText: clean(item.sourceText) ?? "",
      transactionId,
    });
  }

  return transactions;
};
