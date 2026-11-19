/**
 * Pattern-based parsing of transaction notifications (SMS text pasted, typed,
 * dictated, or recognised from a screenshot).
 *
 * Pure TypeScript with no runtime dependencies so both the app and Convex
 * functions can use it. Unknown formats are left for the AI fallback.
 */

/** Known notification formats; "other" is anything read by an AI model. */
export type CaptureProvider = "fnb" | "ghanapay" | "mtn_momo" | "other";

export type CaptureDirection = "credit" | "debit";

/** Wall-clock date and time as printed in the message or the Messages app. */
export interface CaptureDateTime {
  day: number;
  hour: number;
  minute: number;
  /** 1-12. */
  month: number;
  second: number;
  year: number;
}

export interface ParsedCaptureTransaction {
  /** Last digits of the bank account the message is about, when printed. */
  accountSuffix?: string;
  /** Positive amount in minor units (pesewas). */
  amount: number;
  /** Account balance after the transaction, in minor units, when printed. */
  balanceAfter?: number;
  /** Phone number or account of the other party. */
  counterpartyAccount?: string;
  /** Name or network of the other party. */
  counterpartyName?: string;
  currency: "GHS";
  /** Suggested transaction description. */
  description: string;
  direction: CaptureDirection;
  /** Deterministic key for de-duplicating re-captured messages. */
  externalRef: string;
  /** Fee in minor units; 0 when the message reports none. */
  fee: number;
  /** When the transaction happened; absent when neither the message nor a nearby timestamp says. */
  occurredAt?: CaptureDateTime;
  /** Where `occurredAt` came from. */
  occurredAtSource?: "message" | "thread";
  /** Who sent the notification, as named by an AI model (for "other" only). */
  institution?: string;
  provider: CaptureProvider;
  /** Free-text reference typed by the sender, when meaningful. */
  reference?: string;
  /** The matched message text, whitespace-normalised. */
  sourceText: string;
  /** Provider transaction ID, when printed. */
  transactionId?: string;
}

export interface ParseCaptureOptions {
  /**
   * When the text was captured (e.g. the screenshot's creation date). Used to
   * resolve Messages-app timestamps such as "Yesterday 12:28". Defaults to now.
   */
  referenceDate?: Date;
}

export interface ParseCaptureResult {
  /**
   * Leftover text that still mentions a cedi amount. Non-empty means some
   * messages were not recognised (or were cut off) and may need the AI fallback.
   */
  unparsedSegments: string[];
  /** In the order they appear in the text (oldest first for a Messages thread). */
  transactions: ParsedCaptureTransaction[];
}

// Greedy so a trailing amount is never cut short ("2399.03", "1,071.75").
const AMOUNT_BODY = String.raw`\d+(?:,\d{3})*(?:\.\d{1,2})?`;
const AMOUNT = `(${AMOUNT_BODY})`;
const GHS = String.raw`GHS\s?`;

// GhanaPay: "You have transferred GHS 600.00 to 0554848494 MTN MOBILE MONEY.
// Ref: customs handling. Transaction ID: 632212280813. Balance: GHS 2399.03."
const GHANAPAY_TRANSFER = new RegExp(
  String.raw`You have transferred ${GHS}${AMOUNT} to (\+?\d[\d ]{6,}\d) (.+?)\. Ref: ?(.*?)\. Transaction ID: ?(\d+)\. Balance: ${GHS}${AMOUNT}`,
  "gi"
);

// MTN MoMo: "Payment received for GHS 10000.00 from JANE DOE (233200000000)
// Current Balance: GHS 10125.64 . Available Balance: GHS 10125.64.
// Reference: 1. Transaction ID: 93949862585. Fee charged: GHS0.00."
// and "Payment made for GHS 138.00 to JOHN DOE Current Balance: ...
// Fee charged: GHS1.03 Tax charged: 0."
const MOMO_PAYMENT = new RegExp(
  String.raw`Payment (received|made) for ${GHS}${AMOUNT} (?:from|to) (.+?)(?: ?\(?(\d{6,})\))? Current Balance: ${GHS}${AMOUNT} ?\. Available Balance: ${GHS}${AMOUNT} ?\. Reference: ?(.*?)\. Transaction ID: ?(\d+)\. Fee charged: ${GHS}${AMOUNT}(?:\.? Tax charged: ?(?:${GHS})?${AMOUNT})?`,
  "gi"
);

// MTN MoMo: "Your payment of GHS 4500.00 to GHANAPAY PUSH has been completed
// at 2026-11-17 11:57:24. Your new balance: GHS 5479.11. Fee was GHS 7.50
// Tax was GHS -. Reference: -. Financial Transaction Id: 94019968818."
const MOMO_PAYMENT_COMPLETED = new RegExp(
  String.raw`Your payment of ${GHS}${AMOUNT} to (.+?) has been completed at (\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\. Your new balance: ${GHS}${AMOUNT} ?\. Fee was ${GHS}(${AMOUNT_BODY}|-) ?\.? Tax was ${GHS}(?:${AMOUNT_BODY}|-) ?\. Reference: ?(.*?)\. Financial Transaction Id: ?(\d+)`,
  "gi"
);

// FNB: "Dear valued customer, GHS 370.00DR paid from your First National Bank
// Platinum Lifestyle Cheque...*********7505 @EFT. ... Payment Details
// PI263200WC01D6NH Account balance is GHS 71.75 as at 16 NOV 2026 12:56"
const FNB_PAYMENT = new RegExp(
  String.raw`Dear valued customer, ?${GHS}${AMOUNT} ?(DR|CR)? paid (to|from) your (.+?) ?(?:\.{3}|…) ?[*•xX]*(\d{3,4}) ?@ ?(\w+) ?\. ?(?:\.{3}|…) ?Payment Details ?(.*?) ?Account balance is ${GHS}${AMOUNT} ?as at (\d{1,2}) ([A-Za-z]{3}) (\d{4}) (\d{2}):(\d{2})`,
  "gi"
);

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

// Messages-app separators: "Today 15:58", "Yesterday 12:28", "Tuesday 09:06",
// "Sat, 8 Nov at 14:02", "8 Nov 2025 at 14:02".
const THREAD_TIMESTAMP =
  /\b(?:(?<relative>Today|Yesterday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)|(?:(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat),? )?(?<day>\d{1,2}) (?<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?: (?<year>\d{4}))?(?: at)?) (?<hour>\d{1,2}):(?<minute>\d{2})\b/g;

const WHITESPACE = /\s+/g;
const UNPARSED_AMOUNT = /GHS\s?\d/i;
const HAS_LETTER = /\p{L}/u;
const NON_DIGIT = /\D/g;
const WORD_START = /(?<prefix>^|[\s-])(?<letter>\p{L})/gu;
const MINOR_UNITS_PER_MAJOR = 100;
const DAYS_IN_WEEK = 7;

/** Converts "1,071.75" to 107175 without floating-point rounding. */
export const parseAmountToMinorUnits = (value: string): number => {
  const [whole = "0", fraction = ""] = value.replaceAll(",", "").split(".");
  return (
    Number.parseInt(whole, 10) * MINOR_UNITS_PER_MAJOR +
    Number.parseInt(fraction.padEnd(2, "0").slice(0, 2), 10)
  );
};

const normalizeText = (text: string): string =>
  text
    .replaceAll(" ", " ")
    .replaceAll("’", "'")
    .replace(WHITESPACE, " ")
    .trim();

const meaningfulReference = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!(trimmed && HAS_LETTER.test(trimmed))) {
    return;
  }
  return trimmed;
};

const titleCase = (value: string): string =>
  value
    .toLocaleLowerCase()
    .replace(
      WORD_START,
      (_, prefix: string, letter: string) =>
        `${prefix}${letter.toLocaleUpperCase()}`
    );

const monthIndex = (value: string): number =>
  MONTHS.indexOf(
    value.slice(0, 3).toLocaleLowerCase() as (typeof MONTHS)[number]
  );

const pad = (value: number): string => String(value).padStart(2, "0");

const formatDateTimeKey = (value: CaptureDateTime): string =>
  `${value.year}-${pad(value.month)}-${pad(value.day)}T${pad(value.hour)}:${pad(value.minute)}`;

interface ThreadTimestamp {
  end: number;
  index: number;
  value: CaptureDateTime;
}

const shiftDays = (date: Date, days: number): Date => {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
};

const resolveRelativeDay = (label: string, referenceDate: Date): Date => {
  const normalized = label.toLocaleLowerCase();
  if (normalized === "today") {
    return referenceDate;
  }
  if (normalized === "yesterday") {
    return shiftDays(referenceDate, -1);
  }
  const weekday = WEEKDAYS.indexOf(normalized as (typeof WEEKDAYS)[number]);
  // Messages shows weekday names only for the past week, never for today.
  const daysBack =
    (referenceDate.getDay() - weekday + DAYS_IN_WEEK) % DAYS_IN_WEEK ||
    DAYS_IN_WEEK;
  return shiftDays(referenceDate, -daysBack);
};

const findThreadTimestamps = (
  text: string,
  referenceDate: Date
): ThreadTimestamp[] => {
  const timestamps: ThreadTimestamp[] = [];
  for (const match of text.matchAll(THREAD_TIMESTAMP)) {
    // Positional, not `match.groups`: Hermes omits groups on matchAll results.
    const [, relative, day, month, year, hour, minute] = match;
    let date: Date;
    if (relative) {
      date = resolveRelativeDay(relative, referenceDate);
    } else {
      const parsedYear = year
        ? Number.parseInt(year, 10)
        : referenceDate.getFullYear();
      date = new Date(
        parsedYear,
        monthIndex(month ?? ""),
        Number.parseInt(day ?? "1", 10)
      );
      // A date without a year that lands in the future belongs to last year.
      if (!year && date > referenceDate) {
        date.setFullYear(parsedYear - 1);
      }
    }
    timestamps.push({
      end: match.index + match[0].length,
      index: match.index,
      value: {
        day: date.getDate(),
        hour: Number.parseInt(hour ?? "0", 10),
        minute: Number.parseInt(minute ?? "0", 10),
        month: date.getMonth() + 1,
        second: 0,
        year: date.getFullYear(),
      },
    });
  }
  return timestamps;
};

const latestTimestampBefore = (
  timestamps: ThreadTimestamp[],
  position: number
): ThreadTimestamp | undefined => {
  let latest: ThreadTimestamp | undefined;
  for (const timestamp of timestamps) {
    if (timestamp.index >= position) {
      break;
    }
    latest = timestamp;
  }
  return latest;
};

interface Match {
  end: number;
  start: number;
  transaction: Omit<ParsedCaptureTransaction, "sourceText">;
}

const parseGhanaPay = (text: string): Match[] =>
  [...text.matchAll(GHANAPAY_TRANSFER)].map((match) => {
    const [full, amount, account, network, reference, transactionId, balance] =
      match;
    const ref = meaningfulReference(reference);
    const counterpartyName = network?.trim();
    return {
      end: match.index + full.length,
      start: match.index,
      transaction: {
        amount: parseAmountToMinorUnits(amount ?? "0"),
        balanceAfter: parseAmountToMinorUnits(balance ?? "0"),
        counterpartyAccount: account?.replace(NON_DIGIT, ""),
        counterpartyName,
        currency: "GHS",
        description: ref ?? `Transfer to ${account}`,
        direction: "debit",
        externalRef: `ghanapay:${transactionId}`,
        fee: 0,
        provider: "ghanapay",
        reference: ref,
        transactionId,
      },
    };
  });

const parseMomoPayment = (text: string): Match[] =>
  [...text.matchAll(MOMO_PAYMENT)].map((match) => {
    const [
      full,
      kind,
      amount,
      party,
      partyAccount,
      ,
      availableBalance,
      reference,
      transactionId,
      fee,
    ] = match;
    const direction: CaptureDirection =
      kind?.toLocaleLowerCase() === "received" ? "credit" : "debit";
    const ref = meaningfulReference(reference);
    const counterpartyName = titleCase(party?.trim() ?? "");
    return {
      end: match.index + full.length,
      start: match.index,
      transaction: {
        amount: parseAmountToMinorUnits(amount ?? "0"),
        balanceAfter: parseAmountToMinorUnits(availableBalance ?? "0"),
        counterpartyAccount: partyAccount,
        counterpartyName,
        currency: "GHS",
        description: ref ?? counterpartyName,
        direction,
        externalRef: `mtn_momo:${transactionId}`,
        fee: parseAmountToMinorUnits(fee ?? "0"),
        provider: "mtn_momo",
        reference: ref,
        transactionId,
      },
    };
  });

const parseMomoPaymentCompleted = (text: string): Match[] =>
  [...text.matchAll(MOMO_PAYMENT_COMPLETED)].map((match) => {
    const [
      full,
      amount,
      party,
      year,
      month,
      day,
      hour,
      minute,
      second,
      balance,
      fee,
      reference,
      transactionId,
    ] = match;
    const ref = meaningfulReference(reference);
    const counterpartyName = titleCase(party?.trim() ?? "");
    return {
      end: match.index + full.length,
      start: match.index,
      transaction: {
        amount: parseAmountToMinorUnits(amount ?? "0"),
        balanceAfter: parseAmountToMinorUnits(balance ?? "0"),
        counterpartyName,
        currency: "GHS",
        description: ref ?? counterpartyName,
        direction: "debit",
        externalRef: `mtn_momo:${transactionId}`,
        fee: fee === "-" ? 0 : parseAmountToMinorUnits(fee ?? "0"),
        occurredAt: {
          day: Number(day),
          hour: Number(hour),
          minute: Number(minute),
          month: Number(month),
          second: Number(second),
          year: Number(year),
        },
        occurredAtSource: "message",
        provider: "mtn_momo",
        reference: ref,
        transactionId,
      },
    };
  });

const parseFnbPayment = (text: string): Match[] =>
  [...text.matchAll(FNB_PAYMENT)].map((match) => {
    const [
      full,
      amount,
      ,
      toOrFrom,
      accountName,
      accountSuffix,
      channel,
      paymentDetails,
      balance,
      day,
      month,
      year,
      hour,
      minute,
    ] = match;
    const direction: CaptureDirection =
      toOrFrom?.toLocaleLowerCase() === "to" ? "credit" : "debit";
    const occurredAt: CaptureDateTime = {
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      month: monthIndex(month ?? "") + 1,
      second: 0,
      year: Number(year),
    };
    const amountMinor = parseAmountToMinorUnits(amount ?? "0");
    const balanceMinor = parseAmountToMinorUnits(balance ?? "0");
    const reference = paymentDetails?.trim() || undefined;
    const channelLabel = channel?.toLocaleUpperCase() ?? "EFT";
    // FNB debits often omit a reference, so key on what is always printed.
    const externalRef = [
      "fnb",
      accountSuffix,
      direction,
      amountMinor,
      balanceMinor,
      formatDateTimeKey(occurredAt),
    ].join(":");
    return {
      end: match.index + full.length,
      start: match.index,
      transaction: {
        accountSuffix,
        amount: amountMinor,
        balanceAfter: balanceMinor,
        counterpartyName: accountName?.trim(),
        currency: "GHS",
        description:
          direction === "credit"
            ? `${channelLabel} received`
            : `${channelLabel} payment`,
        direction,
        externalRef,
        fee: 0,
        occurredAt,
        occurredAtSource: "message",
        provider: "fnb",
        reference,
      },
    };
  });

const PARSERS = [
  parseGhanaPay,
  parseMomoPayment,
  parseMomoPaymentCompleted,
  parseFnbPayment,
] as const;

const findUnparsedSegments = (
  text: string,
  spans: { end: number; start: number }[]
): string[] => {
  const segments: string[] = [];
  let cursor = 0;
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    segments.push(text.slice(cursor, span.start));
    cursor = Math.max(cursor, span.end);
  }
  segments.push(text.slice(cursor));
  return segments
    .map((segment) => segment.trim())
    .filter((segment) => UNPARSED_AMOUNT.test(segment));
};

/**
 * Extracts every complete, recognised transaction message from `text`.
 * Messages cut off at the edges of a screenshot do not match and are skipped.
 */
export const parseCaptureText = (
  text: string,
  options: ParseCaptureOptions = {}
): ParseCaptureResult => {
  const normalized = normalizeText(text);
  const referenceDate = options.referenceDate ?? new Date();
  const timestamps = findThreadTimestamps(normalized, referenceDate);
  const matches = PARSERS.flatMap((parse) => parse(normalized)).sort(
    (a, b) => a.start - b.start
  );

  const seenRefs = new Set<string>();
  const transactions: ParsedCaptureTransaction[] = [];
  for (const match of matches) {
    if (seenRefs.has(match.transaction.externalRef)) {
      continue;
    }
    seenRefs.add(match.transaction.externalRef);

    const transaction: ParsedCaptureTransaction = {
      ...match.transaction,
      sourceText: normalized.slice(match.start, match.end),
    };
    if (!transaction.occurredAt) {
      const threadTimestamp = latestTimestampBefore(timestamps, match.start);
      if (threadTimestamp) {
        transaction.occurredAt = threadTimestamp.value;
        transaction.occurredAtSource = "thread";
      }
    }
    transactions.push(transaction);
  }

  return {
    transactions,
    unparsedSegments: findUnparsedSegments(normalized, [
      ...matches,
      ...timestamps.map(({ end, index }) => ({ end, start: index })),
    ]),
  };
};

/** Signed change to the account balance, including any fee. */
export const balanceDelta = (transaction: ParsedCaptureTransaction): number =>
  (transaction.direction === "credit"
    ? transaction.amount
    : -transaction.amount) - transaction.fee;

export type BalanceContinuity = "consistent" | "gap" | "unknown";

const continuityKey = (transaction: ParsedCaptureTransaction): string =>
  [
    transaction.provider,
    transaction.institution?.toLocaleLowerCase() ?? "",
    transaction.accountSuffix ?? "",
  ].join(":");

/**
 * Checks each transaction's printed balance against the previous one from the
 * same account. "gap" means a message between them is missing (or misread).
 */
export const checkBalanceContinuity = (
  transactions: ParsedCaptureTransaction[]
): BalanceContinuity[] => {
  const previousBalance = new Map<string, number>();
  return transactions.map((transaction) => {
    const key = continuityKey(transaction);
    const previous = previousBalance.get(key);
    const { balanceAfter } = transaction;
    if (balanceAfter === undefined) {
      previousBalance.delete(key);
      return "unknown";
    }
    previousBalance.set(key, balanceAfter);
    if (previous === undefined) {
      return "unknown";
    }
    return previous + balanceDelta(transaction) === balanceAfter
      ? "consistent"
      : "gap";
  });
};

/** Converts a wall-clock capture time to epoch millis in the device time zone. */
export const captureDateTimeToEpoch = (value: CaptureDateTime): number =>
  new Date(
    value.year,
    value.month - 1,
    value.day,
    value.hour,
    value.minute,
    value.second
  ).getTime();
