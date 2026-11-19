import { ConvexError } from "convex/values";

import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { env } from "../../_generated/server";
import { readUsage } from "./usage";

/**
 * Structured JSON requests to an OpenAI-compatible chat completions endpoint
 * (OpenCode pay-as-you-go by default). Environment: LLM_API_KEY, LLM_BASE_URL, LLM_MODEL.
 */

const DEFAULT_BASE_URL = "https://opencode.ai/inference/openai/v1";
// Fast, zero-data-retention, and consistent on multi-message input in testing.
const DEFAULT_MODEL = "glm-5.3-flash";
const MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 45_000;
const USER_AGENT = "balanced/1.0";
const TRAILING_SLASHES = /\/+$/;
const FENCED_JSON = /```(?:json)?\s*(?<body>[\s\S]*?)```/;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isCloudModelConfigured = (): boolean => Boolean(env.LLM_API_KEY);

const parseJsonContent = (content: string): unknown => {
  try {
    return JSON.parse(content);
  } catch {
    const fenced = FENCED_JSON.exec(content)?.[1];
    if (fenced) {
      return JSON.parse(fenced);
    }
    throw new Error("Response was not valid JSON");
  }
};

const requestOnce = async (options: {
  apiKey: string;
  baseUrl: string;
  model: string;
  sessionId: string;
  schema: Record<string, unknown>;
  schemaName: string;
  system: string;
  user: string;
}): Promise<Response> => {
  const response = await fetch(`${options.baseUrl}/chat/completions`, {
    body: JSON.stringify({
      messages: [
        { content: options.system, role: "system" },
        { content: options.user, role: "user" },
      ],
      model: options.model,
      response_format: {
        json_schema: {
          name: options.schemaName,
          schema: options.schema,
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
      "x-opencode-session": options.sessionId,
    },
    method: "POST",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  return response;
};

const readContent = (body: unknown): unknown => {
  const message =
    isRecord(body) && Array.isArray(body.choices) && isRecord(body.choices[0])
      ? body.choices[0].message
      : undefined;
  const content = isRecord(message) ? message.content : undefined;
  if (typeof content !== "string") {
    throw new TypeError("Response had no message content");
  }
  return parseJsonContent(content);
};

/**
 * Sends one structured request and returns `parse(json)`. Malformed output is
 * retried once; HTTP errors (auth, quota) are not.
 */
export const requestStructured = async <T>(
  ctx: Pick<ActionCtx, "runMutation">,
  options: {
    parse: (json: unknown) => T;
    schema: Record<string, unknown>;
    schemaName: string;
    system: string;
    user: string;
  }
): Promise<{ model: string; result: T }> => {
  const apiKey = env.LLM_API_KEY;
  if (!apiKey) {
    throw new ConvexError({
      code: "CLOUD_MODEL_NOT_CONFIGURED",
      message: "Set LLM_API_KEY to enable the cloud model",
    });
  }
  const baseUrl = (env.LLM_BASE_URL ?? DEFAULT_BASE_URL).replace(
    TRAILING_SLASHES,
    ""
  );
  const model = env.LLM_MODEL ?? DEFAULT_MODEL;

  const requestId = crypto.randomUUID();
  const endpointUrl = new URL(baseUrl);
  const endpoint = `${endpointUrl.origin}${endpointUrl.pathname}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    let body: unknown;
    let httpStatus: number | undefined;
    let status:
      | "success"
      | "invalid_response"
      | "http_error"
      | "network_error" = "network_error";
    let result: T | undefined;
    let attemptError: unknown;
    try {
      const response = await requestOnce({
        ...options,
        apiKey,
        baseUrl,
        model,
        sessionId: requestId,
      });
      httpStatus = response.status;
      if (!response.ok) {
        status = "http_error";
        throw new ConvexError({
          code: "CLOUD_MODEL_HTTP_ERROR",
          message: `Model request failed (${response.status})`,
          status: response.status,
        });
      }
      status = "invalid_response";
      body = await response.json();
      result = options.parse(readContent(body));
      status = "success";
    } catch (error) {
      attemptError = error;
      if (
        error instanceof ConvexError &&
        isRecord(error.data) &&
        typeof error.data.status === "number"
      ) {
        httpStatus = error.data.status;
        status = "http_error";
      }
      lastError = error;
    }
    // Persist each billable attempt, even if its output was unusable. Logging
    // failures must not cause another model request (and another charge).
    try {
      await ctx.runMutation(internal.usage.recordAttempt, {
        ...readUsage(body),
        attempt,
        durationMs: Date.now() - startedAt,
        endpoint,
        httpStatus,
        model,
        operation: options.schemaName,
        requestId,
        status,
      });
    } catch {
      console.warn("Could not persist cloud model usage metadata");
    }
    if (status === "success") {
      return { model, result: result as T };
    }
    if (attemptError instanceof ConvexError) {
      throw new ConvexError(attemptError.data);
    }
  }
  throw new ConvexError({
    code: "CLOUD_MODEL_BAD_RESPONSE",
    message:
      lastError instanceof Error ? lastError.message : "Unreadable response",
  });
};
