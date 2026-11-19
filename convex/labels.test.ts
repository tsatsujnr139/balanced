/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

const CATEGORY_NAMES = [
  "Eating Out",
  "Utilities",
  "Groceries",
  "Uncategorized",
];

const setup = async () => {
  const t = convexTest(schema, modules);
  const accountId: Id<"accounts"> = await t.run(
    async (ctx) =>
      await ctx.db.insert("accounts", {
        balance: 100_000,
        color: "#0A84FF",
        currency: "GHS",
        institution: "GhanaPay",
        name: "GhanaPay",
        order: 0,
        symbol: "iphone",
        type: "mobile_money",
      })
  );
  const treats = await t.mutation(api.finance.createTag, {
    color: "#FF2D55",
    name: "Treats",
  });
  const treatsId = treats.id;
  const addPast = (merchant: string, category: string, tagIds: Id<"tags">[]) =>
    t.mutation(api.finance.createTransaction, {
      accountId,
      amount: 2000,
      attachments: [],
      category,
      color: "#FF9500",
      date: Date.now(),
      merchant,
      symbol: "fork.knife",
      tagIds,
      type: "expense",
    });
  return { addPast, t, treatsId };
};

const draft = (key: string, description: string) => ({
  description,
  direction: "debit" as const,
  key,
});

test("suggests labels from history, with rules taking priority", async () => {
  const { addPast, t, treatsId } = await setup();
  await addPast("Boba order", "Eating Out", [treatsId]);
  await addPast("boba delivery", "Eating Out", [treatsId]);
  await t.mutation(api.automaticRules.create, {
    category: { color: "#FFCC00", name: "Utilities", symbol: "bolt.fill" },
    matchTexts: ["ecg"],
    name: "ECG",
    tagIds: [],
    type: "expense",
  });

  const { suggestions } = await t.action(api.labels.suggest, {
    categoryNames: CATEGORY_NAMES,
    drafts: [
      draft("a", "Boba order"),
      draft("b", "ECG prepaid"),
      draft("c", "Customs handling"),
    ],
  });

  const byKey = new Map(suggestions.map((item) => [item.key, item]));
  expect(byKey.get("a")).toMatchObject({
    category: "Eating Out",
    source: "history",
    tagIds: [treatsId],
  });
  expect(byKey.get("b")).toMatchObject({
    category: "Utilities",
    source: "rule",
  });
  // No history and no cloud model configured in tests.
  expect(byKey.has("c")).toBe(false);
});

test("never learns from bookkeeping categories", async () => {
  const { addPast, t } = await setup();
  await addPast("Boba order", "Uncategorized", []);

  const { suggestions } = await t.action(api.labels.suggest, {
    categoryNames: CATEGORY_NAMES,
    drafts: [draft("a", "Boba order")],
  });

  expect(suggestions).toEqual([]);
});
