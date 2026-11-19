import { v } from "convex/values";

export const usageFields = {
  attempt: v.number(),
  billingSource: v.optional(v.string()),
  cachedInputTokens: v.optional(v.number()),
  completionTokens: v.optional(v.number()),
  costEstimated: v.optional(v.boolean()),
  costUsd: v.optional(v.number()),
  durationMs: v.number(),
  endpoint: v.string(),
  goAllowanceUsd: v.optional(v.number()),
  httpStatus: v.optional(v.number()),
  listCostUsd: v.optional(v.number()),
  model: v.string(),
  operation: v.string(),
  promptTokens: v.optional(v.number()),
  reasoningTokens: v.optional(v.number()),
  requestId: v.string(),
  responseModel: v.optional(v.string()),
  status: v.union(
    v.literal("success"),
    v.literal("invalid_response"),
    v.literal("http_error"),
    v.literal("network_error")
  ),
  totalTokens: v.optional(v.number()),
};

const record = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const nonnegative = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;

/** Only allowlisted numeric billing metadata is stored, never request content. */
export const readUsage = (body: unknown) => {
  const response = record(body);
  const usage = record(response.usage);
  const opencode = record(usage.opencode);
  return {
    billingSource:
      typeof opencode.billing_source === "string"
        ? opencode.billing_source
        : undefined,
    cachedInputTokens: nonnegative(
      record(usage.prompt_tokens_details).cached_tokens
    ),
    completionTokens: nonnegative(usage.completion_tokens),
    costEstimated:
      typeof opencode.estimated === "boolean" ? opencode.estimated : undefined,
    costUsd: nonnegative(usage.cost),
    goAllowanceUsd: nonnegative(opencode.allowance),
    listCostUsd: nonnegative(opencode.list_cost),
    promptTokens: nonnegative(usage.prompt_tokens),
    reasoningTokens: nonnegative(
      record(usage.completion_tokens_details).reasoning_tokens
    ),
    responseModel:
      typeof response.model === "string" ? response.model : undefined,
    totalTokens: nonnegative(usage.total_tokens),
  };
};
