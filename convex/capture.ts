import { ConvexError, v } from "convex/values";

import { action } from "./_generated/server";
import { isRecord, requestStructured } from "./lib/capture/chat";
import type { ModelExtractedTransaction } from "./lib/capture/model";

/**
 * Cloud fallback for transaction notifications the pattern parser and the
 * on-device model couldn't read (OpenCode pay-as-you-go by default; see lib/capture/chat).
 */

const MAX_INPUT_CHARACTERS = 12_000;

const SYSTEM_PROMPT = `You read bank and mobile money notifications (SMS text, or text recognised from a screenshot) for a personal finance app in Ghana.
Extract every complete transaction notification. Copy numbers exactly as printed and never invent values: use null when the message does not state a field.
Skip promotional messages, Messages-app timestamps, and messages cut off at the start or end.
direction is "debit" when money left the account holder's account and "credit" when it arrived.
Amounts, fees, and balances are digits with an optional decimal point (e.g. 1071.75), without currency. currency is the code the amount is in (GHS, USD, USDT, …); use GHS for cedis.
occurredAt is the date and time printed inside the message as "YYYY-MM-DD HH:MM".
For a currency exchange, toAmount and toCurrency are the received amount and currency printed in the notification; otherwise use null.
summary is a short description of what the payment was for.
balanceAfter is the account balance printed after the transaction. counterparty is the other party's name, phone number, or network. institution is who sent the notification (e.g. MTN MoMo, Telecel Cash, a bank). sourceText is the notification copied verbatim.`;

// Strict schemas need every property listed as required; null means "not printed".
const OPTIONAL_STRING = { type: ["string", "null"] } as const;

const RESPONSE_SCHEMA = {
  additionalProperties: false,
  properties: {
    transactions: {
      items: {
        additionalProperties: false,
        properties: {
          amount: { type: "string" },
          balanceAfter: OPTIONAL_STRING,
          counterparty: OPTIONAL_STRING,
          currency: OPTIONAL_STRING,
          direction: { enum: ["debit", "credit"], type: "string" },
          fee: OPTIONAL_STRING,
          institution: OPTIONAL_STRING,
          occurredAt: OPTIONAL_STRING,
          reference: OPTIONAL_STRING,
          sourceText: OPTIONAL_STRING,
          summary: OPTIONAL_STRING,
          transactionId: OPTIONAL_STRING,
          toAmount: OPTIONAL_STRING,
          toCurrency: OPTIONAL_STRING,
        },
        required: [
          "amount",
          "balanceAfter",
          "counterparty",
          "currency",
          "direction",
          "fee",
          "institution",
          "occurredAt",
          "reference",
          "sourceText",
          "summary",
          "transactionId",
          "toAmount",
          "toCurrency",
        ],
        type: "object",
      },
      type: "array",
    },
  },
  required: ["transactions"],
  type: "object",
} as const;

const STRING_FIELDS = [
  "balanceAfter",
  "counterparty",
  "currency",
  "fee",
  "institution",
  "occurredAt",
  "reference",
  "sourceText",
  "summary",
  "transactionId",
  "toAmount",
  "toCurrency",
] as const;

/** Keeps only well-typed fields; anything else the model returned is dropped. */
const sanitizeTransactions = (
  payload: unknown
): ModelExtractedTransaction[] => {
  if (!(isRecord(payload) && Array.isArray(payload.transactions))) {
    throw new Error("Response is missing a transactions array");
  }
  const transactions: ModelExtractedTransaction[] = [];
  for (const item of payload.transactions) {
    if (
      !isRecord(item) ||
      typeof item.amount !== "string" ||
      typeof item.direction !== "string"
    ) {
      continue;
    }
    const transaction: ModelExtractedTransaction = {
      amount: item.amount,
      direction: item.direction,
    };
    for (const field of STRING_FIELDS) {
      const value = item[field];
      if (typeof value === "string" && value.trim()) {
        transaction[field] = value.trim();
      }
    }
    transactions.push(transaction);
  }
  return transactions;
};

export const extractTransactions = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (!text) {
      return { model: "", transactions: [] };
    }
    if (text.length > MAX_INPUT_CHARACTERS) {
      throw new ConvexError({
        code: "CLOUD_MODEL_INPUT_TOO_LONG",
        message: `Text must be at most ${MAX_INPUT_CHARACTERS} characters`,
      });
    }
    const { model, result } = await requestStructured(ctx, {
      parse: sanitizeTransactions,
      schema: RESPONSE_SCHEMA,
      schemaName: "transaction_extraction",
      system: SYSTEM_PROMPT,
      user: text,
    });
    return { model, transactions: result };
  },
});
