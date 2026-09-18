/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

const createAccount = async (
  testBackend: ReturnType<typeof convexTest>,
  name: string,
  order: number
): Promise<Id<"accounts">> =>
  await testBackend.run(
    async (ctx) =>
      await ctx.db.insert("accounts", {
        balance: 0,
        color: "#0A84FF",
        currency: "GHS",
        institution: "Test bank",
        name,
        order,
        symbol: "building.columns.fill",
        type: "current",
      })
  );

describe("reorderAccounts", () => {
  test("persists the provided order", async () => {
    const testBackend = convexTest(schema, modules);
    const first = await createAccount(testBackend, "First", 0);
    const second = await createAccount(testBackend, "Second", 1);
    const third = await createAccount(testBackend, "Third", 2);

    await testBackend.mutation(api.finance.reorderAccounts, {
      ids: [third, first, second],
    });

    const snapshot = await testBackend.query(api.finance.getSnapshot);
    expect(snapshot.accounts.map((account) => account.name)).toEqual([
      "Third",
      "First",
      "Second",
    ]);
  });

  test("ignores duplicates and appends accounts omitted from the list", async () => {
    const testBackend = convexTest(schema, modules);
    await createAccount(testBackend, "First", 0);
    await createAccount(testBackend, "Second", 1);
    const third = await createAccount(testBackend, "Third", 2);

    await testBackend.mutation(api.finance.reorderAccounts, {
      ids: [third, third],
    });

    const snapshot = await testBackend.query(api.finance.getSnapshot);
    expect(snapshot.accounts.map((account) => account.name)).toEqual([
      "Third",
      "First",
      "Second",
    ]);
  });
});
