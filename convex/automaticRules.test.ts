/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

const createAccount = async (
  testBackend: ReturnType<typeof convexTest>
): Promise<Id<"accounts">> =>
  await testBackend.run(
    async (ctx) =>
      await ctx.db.insert("accounts", {
        balance: 100_000,
        color: "#0A84FF",
        currency: "GHS",
        institution: "Test bank",
        name: "Everyday",
        order: 0,
        symbol: "building.columns.fill",
        type: "current",
      })
  );

const createTransaction = async (
  testBackend: ReturnType<typeof convexTest>,
  accountId: Id<"accounts">,
  options: {
    category?: { color: string; name: string; symbol: string };
    description: string;
    tagIds?: Id<"tags">[];
    type?: "expense" | "income";
  }
) =>
  await testBackend.mutation(api.finance.createTransaction, {
    accountId,
    amount: 1000,
    attachments: [],
    category: options.category?.name,
    color: options.category?.color,
    date: Date.now(),
    merchant: options.description,
    symbol: options.category?.symbol,
    tagIds: options.tagIds ?? [],
    type: options.type ?? "expense",
  });

const createTag = async (
  testBackend: ReturnType<typeof convexTest>,
  name: string,
  color: string
): Promise<Id<"tags">> => {
  const tag = await testBackend.mutation(api.finance.createTag, {
    color,
    name,
  });
  return tag.id;
};

describe("automatic transaction rules", () => {
  test("uses the first matching category and unions tags case-insensitively", async () => {
    const testBackend = convexTest(schema, modules);
    const accountId = await createAccount(testBackend);
    const coffeeTag = await createTag(testBackend, "Coffee", "#A2845E");
    const workTag = await createTag(testBackend, "Work", "#5856D6");

    const coffeeRuleId = await testBackend.mutation(api.automaticRules.create, {
      category: {
        color: "#FF9500",
        name: "Eating Out",
        symbol: "fork.knife",
      },
      matchTexts: ["espresso", "COFFEE", " coffee "],
      name: "Coffee purchases",
      tagIds: [coffeeTag],
      type: "expense",
    });
    await testBackend.mutation(api.automaticRules.create, {
      category: {
        color: "#34C759",
        name: "Groceries",
        symbol: "cart.fill",
      },
      matchTexts: ["market", "shop"],
      name: "Shop purchases",
      tagIds: [workTag, coffeeTag],
      type: "expense",
    });

    const result = await createTransaction(testBackend, accountId, {
      description: "Morning coffee shop",
    });
    const saved = await testBackend.run(async (ctx) => {
      const transaction = await ctx.db.get(
        "transactions",
        result.mainTransactionId
      );
      const links = await ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (query) =>
          query.eq("transactionId", result.mainTransactionId)
        )
        .collect();
      return { links, transaction };
    });

    expect(saved.transaction).toMatchObject({
      category: "Eating Out",
      color: "#FF9500",
      symbol: "fork.knife",
    });
    expect(new Set(saved.links.map((link) => link.tagId))).toEqual(
      new Set([coffeeTag, workTag])
    );
    expect(
      await testBackend.query(api.automaticRules.get, { id: coffeeRuleId })
    ).toMatchObject({ matchTexts: ["espresso", "COFFEE"] });
  });

  test("preserves manual category and tags independently", async () => {
    const testBackend = convexTest(schema, modules);
    const accountId = await createAccount(testBackend);
    const automaticTag = await createTag(testBackend, "Automatic", "#5856D6");
    const manualTag = await createTag(testBackend, "Manual", "#FF2D55");
    await testBackend.mutation(api.automaticRules.create, {
      category: {
        color: "#FF9500",
        name: "Eating Out",
        symbol: "fork.knife",
      },
      matchTexts: ["cafe"],
      name: "Cafe",
      tagIds: [automaticTag],
      type: "expense",
    });

    const manualCategoryResult = await createTransaction(
      testBackend,
      accountId,
      {
        category: {
          color: "#34C759",
          name: "Groceries",
          symbol: "cart.fill",
        },
        description: "Corner cafe",
      }
    );
    const manualTagsResult = await createTransaction(testBackend, accountId, {
      description: "Another cafe",
      tagIds: [manualTag],
    });
    const saved = await testBackend.run(async (ctx) => {
      const manualCategoryTransaction = await ctx.db.get(
        "transactions",
        manualCategoryResult.mainTransactionId
      );
      const manualCategoryLinks = await ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (query) =>
          query.eq("transactionId", manualCategoryResult.mainTransactionId)
        )
        .collect();
      const manualTagsTransaction = await ctx.db.get(
        "transactions",
        manualTagsResult.mainTransactionId
      );
      const manualTagLinks = await ctx.db
        .query("transactionTags")
        .withIndex("by_transactionId", (query) =>
          query.eq("transactionId", manualTagsResult.mainTransactionId)
        )
        .collect();
      return {
        manualCategoryLinks,
        manualCategoryTransaction,
        manualTagLinks,
        manualTagsTransaction,
      };
    });

    expect(saved.manualCategoryTransaction?.category).toBe("Groceries");
    expect(saved.manualCategoryLinks.map((link) => link.tagId)).toEqual([
      automaticTag,
    ]);
    expect(saved.manualTagsTransaction?.category).toBe("Eating Out");
    expect(saved.manualTagLinks.map((link) => link.tagId)).toEqual([manualTag]);
  });

  test("falls back to Uncategorized and separates expense from income rules", async () => {
    const testBackend = convexTest(schema, modules);
    const accountId = await createAccount(testBackend);
    await testBackend.mutation(api.automaticRules.create, {
      category: {
        color: "#34C759",
        name: "Salary",
        symbol: "banknote.fill",
      },
      matchTexts: ["payroll"],
      name: "Salary income",
      tagIds: [],
      type: "income",
    });

    const expenseResult = await createTransaction(testBackend, accountId, {
      description: "Payroll fee",
      type: "expense",
    });
    const incomeResult = await createTransaction(testBackend, accountId, {
      description: "August PAYROLL",
      type: "income",
    });
    const transactions = await testBackend.run(async (ctx) => ({
      expense: await ctx.db.get(
        "transactions",
        expenseResult.mainTransactionId
      ),
      income: await ctx.db.get("transactions", incomeResult.mainTransactionId),
    }));

    expect(transactions.expense).toMatchObject({
      category: "Uncategorized",
      color: "#8E8E93",
      symbol: "square.grid.2x2",
    });
    expect(transactions.income?.category).toBe("Salary");
  });

  test("cleans deleted actions from rules and deletes empty rules", async () => {
    const testBackend = convexTest(schema, modules);
    const tagId = await createTag(testBackend, "Work", "#5856D6");
    await testBackend.mutation(api.automaticRules.create, {
      category: {
        color: "#5AC8FA",
        name: "Work & Career",
        symbol: "briefcase.fill",
      },
      matchTexts: ["office"],
      name: "Office",
      tagIds: [tagId],
      type: "expense",
    });

    await testBackend.mutation(api.finance.deleteTag, { id: tagId });
    expect(await testBackend.query(api.automaticRules.list)).toMatchObject([
      { category: { name: "Work & Career" }, tags: [] },
    ]);

    await testBackend.mutation(api.finance.deleteCategoryByName, {
      name: "Work & Career",
    });
    expect(await testBackend.query(api.automaticRules.list)).toEqual([]);
  });

  test("rejects rules without a category or tags", async () => {
    const testBackend = convexTest(schema, modules);
    await expect(
      testBackend.mutation(api.automaticRules.create, {
        matchTexts: ["coffee"],
        name: "No action",
        tagIds: [],
        type: "expense",
      })
    ).rejects.toThrow("Choose a category, at least one tag, or both");
  });
});
