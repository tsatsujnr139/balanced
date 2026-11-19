/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";

import { api, internal } from "./_generated/api";
import { readUsage } from "./lib/capture/usage";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const setup = () => {
  vi.stubEnv("LLM_API_KEY", "test-key");
  const t = convexTest(schema, modules);
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, t };
};

const response = (content: string, cost = 0.0003) =>
  Response.json({
    choices: [{ message: { content } }],
    model: "glm-5.3-flash",
    usage: {
      completion_tokens: 300,
      cost,
      opencode: {
        billing_source: cost === 0 ? "go" : "balance",
        list_cost: 0.0003,
      },
      prompt_tokens: 800,
      total_tokens: 1100,
    },
  });

test("logs both charged attempts when malformed content is retried, without source text", async () => {
  const { fetchMock, t } = setup();
  fetchMock
    .mockResolvedValueOnce(response("invalid JSON"))
    .mockResolvedValueOnce(response('{"transactions":[]}'));
  await t.action(api.capture.extractTransactions, {
    text: "private notification",
  });
  const { page } = await t.query(internal.usage.list, {
    paginationOpts: { cursor: null, numItems: 10 },
  });
  expect(page).toHaveLength(2);
  expect(page.map((row) => row.status).sort()).toEqual([
    "invalid_response",
    "success",
  ]);
  expect(new Set(page.map((row) => row.requestId)).size).toBe(1);
  expect(page.reduce((sum, row) => sum + (row.costUsd ?? 0), 0)).toBeCloseTo(
    0.0006
  );
  expect(page[0]).toMatchObject({
    completionTokens: 300,
    promptTokens: 800,
    billingSource: "balance",
  });
  expect(JSON.stringify(page)).not.toContain("private notification");
  expect(JSON.stringify(page)).not.toContain("test-key");
  expect(fetchMock.mock.calls[0]?.[1].headers["x-opencode-session"]).toBe(
    fetchMock.mock.calls[1]?.[1].headers["x-opencode-session"]
  );
});

test("preserves Go's zero charge rather than substituting list price", async () => {
  const { fetchMock, t } = setup();
  fetchMock.mockResolvedValueOnce(response('{"transactions":[]}', 0));
  await t.action(api.capture.extractTransactions, { text: "notification" });
  const rows = await t.run(
    async (ctx) => await ctx.db.query("llmUsage").collect()
  );
  expect(rows[0]).toMatchObject({
    costUsd: 0,
    listCostUsd: 0.0003,
    billingSource: "go",
  });
});

test("logs quota failure once and leaves unknown costs absent", async () => {
  const { fetchMock, t } = setup();
  fetchMock.mockResolvedValueOnce(
    new Response("quota exhausted", { status: 402 })
  );
  await expect(
    t.action(api.capture.extractTransactions, { text: "notification" })
  ).rejects.toThrow();
  const rows = await t.run(
    async (ctx) => await ctx.db.query("llmUsage").collect()
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ httpStatus: 402, status: "http_error" });
  expect(rows[0]?.costUsd).toBeUndefined();
});

test("records token detail and ignores invalid or missing usage", () => {
  expect(
    readUsage({
      usage: {
        cost: -1,
        prompt_tokens: "800",
        prompt_tokens_details: { cached_tokens: 400 },
        completion_tokens_details: { reasoning_tokens: 20 },
        opencode: { allowance: 0.001, estimated: true },
      },
    })
  ).toMatchObject({
    costUsd: undefined,
    promptTokens: undefined,
    cachedInputTokens: 400,
    reasoningTokens: 20,
    goAllowanceUsd: 0.001,
    costEstimated: true,
  });
  expect(readUsage(null).costUsd).toBeUndefined();
});

test("records invalid response envelopes and network failures without inventing token counts", async () => {
  const { fetchMock, t } = setup();
  fetchMock
    .mockResolvedValueOnce(new Response("not JSON"))
    .mockRejectedValueOnce(new TypeError("network failure"));
  await expect(
    t.action(api.capture.extractTransactions, { text: "notification" })
  ).rejects.toThrow();
  const rows = await t.run(
    async (ctx) => await ctx.db.query("llmUsage").collect()
  );
  expect(rows.map((row) => row.status)).toEqual([
    "invalid_response",
    "network_error",
  ]);
  expect(rows[0]?.httpStatus).toBe(200);
  expect(rows[1]?.httpStatus).toBeUndefined();
  expect(rows.every((row) => row.promptTokens === undefined)).toBe(true);
});
