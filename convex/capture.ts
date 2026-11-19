import { ConvexError, v } from "convex/values";

import { action, env } from "./_generated/server";
import type { ModelExtractedTransaction } from "./lib/capture/model";

/**
 * Cloud fallback for transaction notifications the pattern parser and the
 * on-device model couldn't read. Uses any OpenAI-compatible chat completions
 * endpoint; defaults to OpenCode Go.
 *
 * Environment: LLM_API_KEY (required), LLM_BASE_URL, LLM_MODEL (optional).
 */

const DEFAULT_BASE_URL = "https://opencode.ai/inference/go/openai/v1";
// Fast, zero-data-retention, and consistent on multi-message input in testing.
const DEFAULT_MODEL = "glm-5.3-flash";
const MAX_INPUT_CHARACTERS = 12_000;
const MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 45_000;
const USER_AGENT = "balanced/1.0";

const SYSTEM_PROMPT = `You read bank and mobile money notifications (SMS text, or text recognised from a screenshot) for a personal finance app in Ghana.
Extract every complete transaction notification. Copy numbers exactly as printed and never invent values: use null when the message does not state a field.
Skip promotional messages, Messages-app timestamps, and messages cut off at the start or end.
direction is "debit" when money left the account holder's account and "credit" when it arrived.
Amounts, fees, and balances are digits with an optional decimal point (e.g. 1071.75), without currency.
occurredAt is the date and time printed inside the message as "YYYY-MM-DD HH:MM".
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
          direction: { enum: ["debit", "credit"], type: "string" },
          fee: OPTIONAL_STRING,
          institution: OPTIONAL_STRING,
          occurredAt: OPTIONAL_STRING,
          reference: OPTIONAL_STRING,
          sourceText: OPTIONAL_STRING,
          summary: OPTIONAL_STRING,
          transactionId: OPTIONAL_STRING,
        },
        required: [
          "amount",
          "balanceAfter",
          "counterparty",
          "direction",
          "fee",
          "institution",
          "occurredAt",
          "reference",
          "sourceText",
          "summary",
          "transactionId",
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
  "fee",
  "institution",
  "occurredAt",
  "reference",
  "sourceText",
  "summary",
  "transactionId",
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

const FENCED_JSON = /```(?:json)?\s*(?<body>[\s\S]*?)```/;

const parseJsonContent = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    const fenced = FENCED_JSON.exec(content)?.groups?.body;
    if (fenced) {
      return JSON.parse(fenced);
    }
    throw new Error("Response was not valid JSON");
  }
};

const requestCompletion = async (options: {
  apiKey: string;
  baseUrl: string;
  model: string;
  text: string;
}): Promise<ModelExtractedTransaction[]> => {
  const response = await fetch(`${options.baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        { content: SYSTEM_PROMPT, role: "system" },
        { content: options.text, role: "user" },
      ],
      model: options.model,
      response_format: {
        json_schema: {
          name: "transaction_extraction",
          schema: RESPONSE_SCHEMA,
          strict: true,
        },
        type: "json_schema",
      },
      temperature: 0,
    }),
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      "x-opencode-session": crypto.randomUUID(),
    },
    method: "POST",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new ConvexError({
      code: "CLOUD_MODEL_HTTP_ERROR",
      message: `Model request failed (${response.status}): ${detail}`,
      status: response.status,
    });
  }

  const body: unknown = await response.json();
  const content =
    isRecord(body) && Array.isArray(body.choices) && isRecord(body.choices[0])
      ? (body.choices[0].message as { content?: unknown } | undefined)?.content
      : undefined;
  if (typeof content !== "string") {
    throw new TypeError("Response had no message content");
  }
  return sanitizeTransactions(parseJsonContent(content));
};

export const extractTransactions = action({
  args: { text: v.string() },
  handler: async (_ctx, args) => {
    const apiKey = env.LLM_API_KEY;
    if (!apiKey) {
      throw new ConvexError({
        code: "CLOUD_MODEL_NOT_CONFIGURED",
        message: "Set LLM_API_KEY to enable the cloud fallback",
      });
    }
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

    const baseUrl = (env.LLM_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    const model = env.LLM_MODEL ?? DEFAULT_MODEL;

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const transactions = await requestCompletion({
          apiKey,
          baseUrl,
          model,
          text,
        });
        return { model, transactions };
      } catch (error) {
        // HTTP errors (auth, quota) won't improve on retry; malformed output might.
        if (error instanceof ConvexError) {
          throw error;
        }
        lastError = error;
      }
    }
    throw new ConvexError({
      code: "CLOUD_MODEL_BAD_RESPONSE",
      message:
        lastError instanceof Error ? lastError.message : "Unreadable response",
    });
  },
});
