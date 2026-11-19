import Storage from "expo-sqlite/kv-store";

import type { ParsedCaptureTransaction } from "@/convex/lib/capture/parser";
import type { CapturedTransfer } from "@/convex/lib/capture/transfers";

const CAPTURE_ACCOUNTS_KEY = "capture.accountBySource.v1";

/** Identifies the account a notification is about, e.g. "fnb:7505" or "ghanapay:". */
export const captureSourceKey = (
  transaction: ParsedCaptureTransaction
): string =>
  transaction.provider === "other"
    ? `other:${transaction.institution?.toLocaleLowerCase() ?? ""}`
    : `${transaction.provider}:${transaction.accountSuffix ?? ""}`;

const readMap = (): Record<string, string> => {
  try {
    const raw = Storage.getItemSync(CAPTURE_ACCOUNTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
};

/** The account last chosen for this notification source, if any. */
export const getRememberedAccountId = (sourceKey: string): string | undefined =>
  readMap()[sourceKey];

/** Remembers the account for future captures from the same source. */
export const rememberAccountId = (sourceKey: string, accountId: string) => {
  const map = readMap();
  if (map[sourceKey] === accountId) {
    return;
  }
  map[sourceKey] = accountId;
  try {
    Storage.setItemSync(CAPTURE_ACCOUNTS_KEY, JSON.stringify(map));
  } catch {
    /* Remembering the account is best-effort. */
  }
};

const PROVIDER_LABELS: Record<ParsedCaptureTransaction["provider"], string> = {
  bybit: "Bybit",
  fnb: "First National Bank",
  ghanapay: "GhanaPay",
  grey: "Grey",
  mtn_momo: "MTN MoMo",
  other: "Other",
  wise: "Wise",
};

/**
 * Identifies where a transfer lands: the paired incoming message's source if
 * the capture contained one, otherwise the on-screen hint and currency.
 */
export const captureDestinationKey = (
  transaction: CapturedTransfer
): string => {
  const { pairedLeg, transfer } = transaction;
  if (pairedLeg) {
    return pairedLeg.provider === "other"
      ? `other:${pairedLeg.institution?.toLocaleLowerCase() ?? ""}`
      : `${pairedLeg.provider}:${pairedLeg.accountSuffix ?? ""}`;
  }
  const hint = transfer?.destinationHint?.toLocaleLowerCase() ?? "";
  return `dest:${hint}:${transfer?.toCurrency ?? transaction.currency}`;
};

export const captureSourceLabel = (
  transaction: ParsedCaptureTransaction
): string => {
  if (transaction.provider === "other") {
    return transaction.institution ?? "Other";
  }
  const label = PROVIDER_LABELS[transaction.provider];
  return transaction.accountSuffix
    ? `${label} ••${transaction.accountSuffix}`
    : label;
};
