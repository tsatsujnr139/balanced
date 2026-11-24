/**
 * Pattern-based parsing of transaction notifications (SMS text pasted, typed,
 * dictated, or recognised from a screenshot).
 *
 * Pure TypeScript with no runtime dependencies so both the app and Convex
 * functions can use it. Unknown formats are left for the AI fallback.
 */

import { walletBankDestination } from "./banks";

/** Known notification formats; "other" is anything read by an AI model. */
export type CaptureProvider =
  | "bybit"
  | "fnb"
  | "ghanapay"
  | "grey"
  | "mtn_momo"
  | "other"
  | "wise";

/**
 * Money moving between the user's own accounts (or an exchange), rather than
 * spending or income.
 */
export interface CaptureTransferDetails {
  kind?: "Wallet2Bank";
  /** What the destination looks like on screen, e.g. "Grey" or "GHS P2P buyer". */
  destinationHint?: string;
  /** Exchange rate as printed (destination units per source unit). */
  rate?: number;
  /** Amount received, minor units of `toCurrency`, when it differs from `amount`. */
  toAmount?: number;
  toCurrency?: string;
}

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
  /** ISO-like code, e.g. "GHS", "USD", "USDT". */
  currency: string;
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
  /** Set when this is a transfer or exchange rather than spending/income. */
  transfer?: CaptureTransferDetails;
}

export interface ParseCaptureOptions {
  /**
   * When the text was captured (e.g. the screenshot's creation date). Used to
   * resolve Messages-app timestamps such as "Yesterday 12:28". Defaults to now.
   */
  referenceDate?: Date;
  /**
   * The user's account currencies and account/institution names. Unknown text
   * that mentions one of them next to an amount is still sent to the models.
   */
  relevance?: CaptureRelevance;
}

export interface CaptureRelevance {
  currencies?: string[];
  names?: string[];
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
const UNPARSED_AMOUNT =
  /(?:\b(?:GHS|GH₵|USDT?|EUR|GBP|NGN)|[₵$€£])\s?\d|\d\s?(?:GHS|USDT?|EUR|GBP|NGN)\b/i;
// A figure written like money ("20,000.00", "1,596.1691") or any 2+ digit number.
const MONEY_FIGURE = /\d(?:[\d,]*\.\d{2,})\b/;
const NUMBER = /\d{2,}/;
const FINANCIAL_WORD =
  /\b(?:amount|balance|paid|payment|sent|received|transfer(?:red)?|withdrawal|deposit|debit(?:ed)?|credit(?:ed)?|total|fees?|order|purchase|sold|bought|refund)\b/i;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;
const HAS_LETTER = /\p{L}/u;
const NON_DIGIT = /\D/g;
const WORD_START = /(?<prefix>^|[\s-])(?<letter>\p{L})/gu;
const MINOR_UNITS_PER_MAJOR = 100;
const DAYS_IN_WEEK = 7;

const HALF_UP_DIGIT = 5;

/**
 * Converts "1,071.75" to 107175 without floating-point rounding. Extra
 * decimals (USDT "815.6606") round half up to two places.
 */
export const parseAmountToMinorUnits = (value: string): number => {
  const [whole = "0", fraction = ""] = value.replaceAll(",", "").split(".");
  const cents =
    Number.parseInt(whole || "0", 10) * MINOR_UNITS_PER_MAJOR +
    Number.parseInt(fraction.padEnd(2, "0").slice(0, 2), 10);
  const nextDigit = Number.parseInt(fraction.charAt(2) || "0", 10);
  return nextDigit >= HALF_UP_DIGIT ? cents + 1 : cents;
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
    const bank = walletBankDestination(party?.trim() ?? "");
    return {
      end: match.index + full.length,
      start: match.index,
      transaction: {
        amount: parseAmountToMinorUnits(amount ?? "0"),
        balanceAfter: parseAmountToMinorUnits(balance ?? "0"),
        counterpartyName,
        currency: "GHS",
        description: bank
          ? `Wallet2Bank to ${bank}${ref ? `: ${ref}` : ""}`
          : (ref ?? counterpartyName),
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
        transfer: bank
          ? { kind: "Wallet2Bank", destinationHint: bank, toCurrency: "GHS" }
          : undefined,
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

// ---------------------------------------------------------------------------
// App screens (text recognised from screenshots of banking / exchange apps)
// ---------------------------------------------------------------------------

const BYBIT_ORDER_HEADING = /\b(?<side>Sell|Buy) USDT\b/g;
const BYBIT_ORDER_HEADING_ONCE = /\b(?:Sell|Buy) USDT\b/;
const BYBIT_COMPLETED = /\bCompleted\b/;
const BYBIT_CANCELED = /\bCancell?ed\b/;
// The order details screen puts its status above the "Sell USDT" heading:
// "Completed Sold 1596.1691 USDT".
const BYBIT_DETAILS_STATUS = /\bCompleted (?:Sold|Bought) [\d,.]+ USDT\b/;
const BYBIT_FIAT = /(?<fiat>[\d,]+\.\d{2}) GHS/;
const BYBIT_PRICE = /Price:? (?<price>[\d,]+\.\d+) GHS/;
// "Qty" in the orders list, "Total Quantity" on the order details screen.
const BYBIT_QTY = /(?:Qty|Total Quantity):? (?<qty>[\d,]+\.\d+) USDT/;
// P2P order numbers are 19 digits; OCR sometimes reads the copy icon after
// them as an extra digit, so take exactly 19.
const BYBIT_ORDER_NO = /Order No\.? ?(?<orderNo>\d{19})/;
const BYBIT_COUNTERPARTY = /(?:^|\s)[•=·] ?(?<party>.+?) \d{4}-\d{2}-\d{2}/;
const ISO_DATE_TIME =
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2}) (?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})/;

/**
 * Bybit P2P "Orders" list (one transaction per completed order) and the
 * details screen of a single order.
 */
const parseBybitP2pOrders = (text: string): Match[] => {
  const headings = [...text.matchAll(BYBIT_ORDER_HEADING)];
  const matches: Match[] = [];
  headings.forEach((heading, index) => {
    const start = heading.index;
    const end = headings[index + 1]?.index ?? text.length;
    const block = text.slice(start, end);
    const detailsStatus =
      index === 0 ? BYBIT_DETAILS_STATUS.exec(text.slice(0, start)) : null;
    const isCompleted =
      BYBIT_COMPLETED.test(block) ||
      (detailsStatus !== null && !BYBIT_CANCELED.test(block));
    const fiat = BYBIT_FIAT.exec(block)?.[1];
    const price = BYBIT_PRICE.exec(block)?.[1];
    const qty = BYBIT_QTY.exec(block)?.[1];
    const orderNo = BYBIT_ORDER_NO.exec(block)?.[1];
    const when = ISO_DATE_TIME.exec(block);
    // Skip cancelled orders and blocks cut off by the screenshot edge.
    if (!(isCompleted && fiat && price && qty && orderNo && when)) {
      return;
    }
    const [, year, month, day, hour, minute, second] = when;
    const occurredAt: CaptureDateTime = {
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      month: Number(month),
      second: Number(second),
      year: Number(year),
    };
    const counterpartyName = BYBIT_COUNTERPARTY.exec(block)?.[1]?.trim();
    const isSell = heading[1] === "Sell";
    const usdt = parseAmountToMinorUnits(qty);
    const ghs = parseAmountToMinorUnits(fiat);
    const rate = Number.parseFloat(price.replaceAll(",", ""));
    const partyText = counterpartyName
      ? ` ${isSell ? "to" : "from"} ${counterpartyName}`
      : "";
    matches.push({
      end: start + when.index + when[0].length,
      // The status line above the heading belongs to the order too.
      start: detailsStatus?.index ?? start,
      transaction: {
        // Selling sends USDT out of Bybit and GHS arrives in a cedi account;
        // buying sends GHS from a cedi account and USDT arrives in Bybit.
        amount: isSell ? usdt : ghs,
        counterpartyName,
        currency: isSell ? "USDT" : "GHS",
        description: `${isSell ? "Sell" : "Buy"} USDT${partyText}`,
        direction: "debit",
        externalRef: `bybit:${orderNo}`,
        fee: 0,
        institution: "Bybit",
        occurredAt,
        occurredAtSource: "message",
        provider: isSell ? "bybit" : "other",
        transactionId: orderNo,
        transfer: {
          destinationHint: isSell ? "Cedi account (P2P buyer pays)" : "Bybit",
          rate,
          toAmount: isSell ? ghs : usdt,
          toCurrency: isSell ? "GHS" : "USDT",
        },
      },
    });
  });
  return matches;
};

// MTN MoMo app "Transaction details": "Date and time 17 Nov 2026 | 09:06
// Beneficiary JOHN DOE Transaction ID 94007436004 Status SUCCESSFUL To
// 233200000000 Transaction type MoMo User Reference Water piping work Amount
// GHS 138 Txn Fees GHS 1.03 Tax GHS 0 Total GHS 139.03"
const MOMO_APP_DETAILS = new RegExp(
  String.raw`Date and time (\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}) ?\|* ?(\d{1,2}):(\d{2}) Beneficiary (.+?) Transaction ID (\d+) Status SUCCESSFUL (?:To (\d+) )?(?:Transaction type .+? )?(?:Reference (.+?) )?Amount ${GHS}${AMOUNT} Txn Fees ${GHS}${AMOUNT}(?: Tax ${GHS}\S+)?(?: Total ${GHS}${AMOUNT_BODY})?`,
  "gi"
);

const parseMomoAppDetails = (text: string): Match[] =>
  [...text.matchAll(MOMO_APP_DETAILS)].map((match) => {
    const [
      full,
      day,
      month,
      year,
      hour,
      minute,
      beneficiary,
      transactionId,
      to,
      reference,
      amount,
      fee,
    ] = match;
    const ref = meaningfulReference(reference);
    const counterpartyName = titleCase(beneficiary?.trim() ?? "");
    return {
      end: match.index + full.length,
      start: match.index,
      transaction: {
        amount: parseAmountToMinorUnits(amount ?? "0"),
        counterpartyAccount: to,
        counterpartyName,
        currency: "GHS",
        description: ref ?? counterpartyName,
        direction: "debit",
        // Same key as the SMS for this payment, so the two never double up.
        externalRef: `mtn_momo:${transactionId}`,
        fee: parseAmountToMinorUnits(fee ?? "0"),
        occurredAt: {
          day: Number(day),
          hour: Number(hour),
          minute: Number(minute),
          month: monthIndex(month ?? "") + 1,
          second: 0,
          year: Number(year),
        },
        occurredAtSource: "message",
        provider: "mtn_momo",
        reference: ref,
        transactionId,
      },
    };
  });

// Wise transfer details: "You sent 2,001.13 USD Wise's fees 1.13 USD You
// received 2,000 USD Transaction number #2492752766"
const WISE_DETAILS = new RegExp(
  String.raw`You sent ${AMOUNT} ([A-Z]{3}) Wise.?s fees ${AMOUNT} [A-Z]{3} (?:You received|Recipient gets) ${AMOUNT} ([A-Z]{3}) Transaction number #?(\d+)`,
  "gi"
);
const WISE_RECIPIENT =
  /\bSent [\d,.]+ [A-Z]{3} (?<recipient>.+?) (?:General|Updates|Details)\b/;
const WISE_NICKNAME = /\bNickname (?<nickname>.+?) Account holder name\b/;

const parseWiseDetails = (text: string): Match[] =>
  [...text.matchAll(WISE_DETAILS)].map((match) => {
    const [
      full,
      sent,
      sentCurrency,
      fees,
      received,
      receivedCurrency,
      transactionId,
    ] = match;
    const fee = parseAmountToMinorUnits(fees ?? "0");
    const receivedMinor = parseAmountToMinorUnits(received ?? "0");
    const sameCurrency = sentCurrency === receivedCurrency;
    const recipientMatch = WISE_RECIPIENT.exec(text);
    const recipient = recipientMatch?.[1]?.trim();
    const nickname = WISE_NICKNAME.exec(text)?.[1]?.trim();
    return {
      end: match.index + full.length,
      // Include the "Sent 2,000 USD <name>" header so it isn't left unread.
      start: Math.min(match.index, recipientMatch?.index ?? match.index),
      transaction: {
        amount: parseAmountToMinorUnits(sent ?? "0") - fee,
        counterpartyName: recipient,
        currency: sentCurrency ?? "USD",
        description: `Wise transfer${recipient ? ` to ${recipient}` : ""}`,
        direction: "debit",
        externalRef: `wise:${transactionId}`,
        fee,
        institution: "Wise",
        provider: "wise",
        transactionId,
        transfer: {
          destinationHint: nickname,
          toAmount: sameCurrency ? undefined : receivedMinor,
          toCurrency: sameCurrency ? undefined : receivedCurrency,
        },
      },
    };
  });

// Grey transaction details: "Sent to JANE DOE Nov 16, 2026 | 12:42pm ...
// Recipient receives ·897.20 Amount sent $900.00 Transaction fee -$1.00
// Exchange rate 1 USD = 1.00 USDT ... Reference code EPBFO02Q8NQ"
const GREY_DETAILS = new RegExp(
  String.raw`Sent to (.+?) ([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) ?\| ?(\d{1,2}):(\d{2}) ?(am|pm)\b[\s\S]{0,80}?Completed Recipient receives \D{0,3}${AMOUNT} Amount sent \D{0,3}${AMOUNT} Transaction fee -?\D{0,3}${AMOUNT} Exchange rate 1 ([A-Z]{3,4}) = ([\d.]+) ([A-Z]{3,4})`,
  "gi"
);
// The code is upper-case letters and digits; OCR can place other labels
// (e.g. "Session ID") between the label and the value.
const GREY_REFERENCE =
  /Reference code\b[\s\S]{0,40}?\b(?<reference>(?=[A-Z0-9]*\d)[A-Z0-9]{8,})\b/;
const HOURS_PER_HALF_DAY = 12;

const parseGreyDetails = (text: string): Match[] =>
  [...text.matchAll(GREY_DETAILS)].map((match) => {
    const [
      full,
      recipient,
      month,
      day,
      year,
      hour12,
      minute,
      meridiem,
      received,
      sent,
      fees,
      fromCurrency,
      rate,
      toCurrency,
    ] = match;
    const reference = GREY_REFERENCE.exec(text.slice(match.index))?.[1];
    const fee = parseAmountToMinorUnits(fees ?? "0");
    let hour = Number(hour12) % HOURS_PER_HALF_DAY;
    if (meridiem?.toLowerCase() === "pm") {
      hour += HOURS_PER_HALF_DAY;
    }
    const sameCurrency = fromCurrency === toCurrency;
    return {
      end: match.index + full.length,
      start: match.index,
      transaction: {
        // "Amount sent" includes Grey's fee; the fee is recorded separately.
        amount: parseAmountToMinorUnits(sent ?? "0") - fee,
        counterpartyName: recipient?.trim(),
        currency: fromCurrency ?? "USD",
        description: `Grey transfer to ${recipient?.trim() ?? "recipient"}`,
        direction: "debit",
        externalRef: `grey:${reference ?? `${year}${month}${day}${hour}${minute}:${sent}`}`,
        fee,
        institution: "Grey",
        occurredAt: {
          day: Number(day),
          hour,
          minute: Number(minute),
          month: monthIndex(month ?? "") + 1,
          second: 0,
          year: Number(year),
        },
        occurredAtSource: "message",
        provider: "grey",
        reference,
        transactionId: reference,
        transfer: {
          destinationHint: `${toCurrency} wallet`,
          rate: Number.parseFloat(rate ?? "1"),
          toAmount: sameCurrency
            ? undefined
            : parseAmountToMinorUnits(received ?? "0"),
          toCurrency: sameCurrency ? undefined : toCurrency,
        },
      },
    };
  });

const PARSERS = [
  parseGhanaPay,
  parseMomoPayment,
  parseMomoPaymentCompleted,
  parseFnbPayment,
  parseBybitP2pOrders,
  parseMomoAppDetails,
  parseWiseDetails,
  parseGreyDetails,
] as const;

const escapeRegExp = (value: string): string =>
  value.replace(REGEX_SPECIAL, String.raw`\$&`);

const phrasePattern = (phrases: string[]): RegExp | null => {
  const words = [
    ...new Set(
      phrases
        .map((phrase) => phrase.trim())
        .filter((phrase) => phrase.length >= 2)
    ),
  ];
  return words.length > 0
    ? new RegExp(String.raw`\b(?:${words.map(escapeRegExp).join("|")})\b`, "i")
    : null;
};

/**
 * Whether text the patterns couldn't read still looks like money moving, so
 * the models should try it: an amount with a currency, a money-looking figure
 * next to a word like "paid" or "amount", or one of the user's own currencies
 * or account names next to a money-looking figure or a number and such a word.
 */
const looksFinancial = (
  segment: string,
  relevance: CaptureRelevance
): boolean => {
  if (UNPARSED_AMOUNT.test(segment)) {
    return true;
  }
  const hasMoneyFigure = MONEY_FIGURE.test(segment);
  const hasFinancialWord = FINANCIAL_WORD.test(segment);
  if (hasMoneyFigure && hasFinancialWord) {
    return true;
  }
  const mentionsAccount =
    phrasePattern([
      ...(relevance.currencies ?? []),
      ...(relevance.names ?? []),
    ])?.test(segment) ?? false;
  return (
    mentionsAccount &&
    (hasMoneyFigure || (hasFinancialWord && NUMBER.test(segment)))
  );
};

const findUnparsedSegments = (
  text: string,
  spans: { end: number; start: number }[],
  relevance: CaptureRelevance
): string[] => {
  const segments: string[] = [];
  let cursor = 0;
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    segments.push(text.slice(cursor, span.start));
    cursor = Math.max(cursor, span.end);
  }
  segments.push(text.slice(cursor));
  return (
    segments
      .map((segment) => segment.trim())
      .filter((segment) => looksFinancial(segment, relevance))
      // A Bybit order without its order number was cut off by the screenshot
      // edge, and a cancelled one moved no money. Anything else is a complete
      // order the patterns didn't read, so the models should try it.
      .filter(
        (segment) =>
          !BYBIT_ORDER_HEADING_ONCE.test(segment) ||
          (BYBIT_ORDER_NO.test(segment) && !BYBIT_CANCELED.test(segment))
      )
  );
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
    unparsedSegments: findUnparsedSegments(
      normalized,
      [
        ...matches,
        ...timestamps.map(({ end, index }) => ({ end, start: index })),
      ],
      options.relevance ?? {}
    ),
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
