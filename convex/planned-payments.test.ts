/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

const createAccount = async (
  testBackend: ReturnType<typeof convexTest>,
  options: { balance: number; currency?: string; name: string; order: number }
): Promise<Id<"accounts">> =>
  await testBackend.run(
    async (ctx) =>
      await ctx.db.insert("accounts", {
        balance: options.balance,
        color: "#0A84FF",
        currency: options.currency ?? "GHS",
        institution: "Test bank",
        name: options.name,
        order: options.order,
        symbol: "building.columns.fill",
        type: "current",
      })
  );

const createPlannedTransfer = async (
  testBackend: ReturnType<typeof convexTest>,
  fromAccountId: Id<"accounts">,
  toAccountId: Id<"accounts">
): Promise<Id<"plannedPayments">> =>
  await testBackend.mutation(api.finance.createPlannedPayment, {
    accountId: fromAccountId,
    amount: 5000,
    category: "Ignored category",
    categoryColor: "#000000",
    categorySymbol: "questionmark",
    description: "Monthly savings",
    frequency: "monthly",
    interval: 1,
    name: "Savings transfer",
    notifyOnDue: true,
    notifyOnOverdue: true,
    startDate: Date.now(),
    tagIds: [],
    toAccountId,
    transactionCharge: 200,
    type: "transfer",
  });

describe("planned transfers", () => {
  test("stores a transfer destination and returns its account details", async () => {
    const testBackend = convexTest(schema, modules);
    const fromAccountId = await createAccount(testBackend, {
      balance: 100_000,
      name: "Everyday",
      order: 0,
    });
    const toAccountId = await createAccount(testBackend, {
      balance: 20_000,
      name: "Savings",
      order: 1,
    });

    const plannedPaymentId = await createPlannedTransfer(
      testBackend,
      fromAccountId,
      toAccountId
    );
    const payment = await testBackend.query(api.finance.getPlannedPayment, {
      id: plannedPaymentId,
    });

    expect(payment).toMatchObject({
      accountId: fromAccountId,
      accountName: "Everyday",
      category: "Transfer",
      toAccountId,
      toAccountName: "Savings",
      transactionCharge: 200,
      type: "transfer",
    });
  });

  test("confirms a planned transfer as paired legs and applies its charge", async () => {
    const testBackend = convexTest(schema, modules);
    const fromAccountId = await createAccount(testBackend, {
      balance: 100_000,
      name: "Everyday",
      order: 0,
    });
    const toAccountId = await createAccount(testBackend, {
      balance: 20_000,
      name: "Savings",
      order: 1,
    });
    const plannedPaymentId = await createPlannedTransfer(
      testBackend,
      fromAccountId,
      toAccountId
    );
    const dueDate = Date.now();
    const transactionId = await testBackend.mutation(
      api.finance.markPlannedPaymentPaid,
      {
        createdByName: "Ama",
        dueDate,
        id: plannedPaymentId,
        paymentDate: dueDate,
      }
    );

    const saved = await testBackend.run(async (ctx) => {
      const fromAccount = await ctx.db.get("accounts", fromAccountId);
      const toAccount = await ctx.db.get("accounts", toAccountId);
      const transferOut = await ctx.db.get("transactions", transactionId);
      const transferIn = transferOut?.pairTransactionId
        ? await ctx.db.get("transactions", transferOut.pairTransactionId)
        : null;
      const charge = await ctx.db
        .query("transactions")
        .withIndex("by_parentTransactionId", (query) =>
          query.eq("parentTransactionId", transactionId)
        )
        .unique();
      const entry = await ctx.db
        .query("plannedPaymentEntries")
        .withIndex("by_plannedPaymentId", (query) =>
          query.eq("plannedPaymentId", plannedPaymentId)
        )
        .unique();
      return { charge, entry, fromAccount, toAccount, transferIn, transferOut };
    });

    expect(saved.transferOut).toMatchObject({
      accountId: fromAccountId,
      amount: -5000,
      toAccountId,
      transactionKind: "transfer_out",
    });
    expect(saved.transferIn).toMatchObject({
      accountId: toAccountId,
      amount: 5000,
      pairTransactionId: transactionId,
      transactionKind: "transfer_in",
    });
    expect(saved.charge).toMatchObject({
      accountId: fromAccountId,
      amount: -200,
      parentTransactionId: transactionId,
      transactionKind: "charge",
    });
    expect(saved.fromAccount?.balance).toBe(94_800);
    expect(saved.toAccount?.balance).toBe(25_000);
    expect(saved.entry).toMatchObject({
      plannedPaymentId,
      status: "paid",
      transactionId,
    });
  });

  test("rejects same-account and cross-currency planned transfers", async () => {
    const testBackend = convexTest(schema, modules);
    const fromAccountId = await createAccount(testBackend, {
      balance: 100_000,
      name: "Everyday",
      order: 0,
    });
    const usdAccountId = await createAccount(testBackend, {
      balance: 20_000,
      currency: "USD",
      name: "Dollar savings",
      order: 1,
    });

    await expect(
      createPlannedTransfer(testBackend, fromAccountId, fromAccountId)
    ).rejects.toThrow("Transfer accounts must be different");
    await expect(
      createPlannedTransfer(testBackend, fromAccountId, usdAccountId)
    ).rejects.toThrow("Transfer accounts must use the same currency");
  });
});
