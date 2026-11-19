/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

const setup = async () => {
  const t = convexTest(schema, modules);
  const insertAccount = (name: string, currency: string, balance: number) =>
    t.run(
      async (ctx): Promise<Id<"accounts">> =>
        await ctx.db.insert("accounts", {
          balance,
          color: "#0A84FF",
          currency,
          institution: name,
          name,
          order: 0,
          symbol: "building.columns.fill",
          type: "current",
        })
    );
  const grey = await insertAccount("Grey", "USD", 500_000);
  const bybit = await insertAccount("Bybit", "USDT", 0);
  const wise = await insertAccount("Wise", "USD", 300_000);
  const balanceOf = async (id: Id<"accounts">) =>
    (await t.run(async (ctx) => await ctx.db.get("accounts", id)))?.balance;
  return { balanceOf, bybit, grey, t, wise };
};

test("a cross-currency transfer credits the received amount", async () => {
  const { balanceOf, bybit, grey, t } = await setup();

  // Grey: $900 sent + $1 fee; Bybit receives ₮897.20.
  const { mainTransactionId } = await t.mutation(
    api.finance.createTransaction,
    {
      accountId: grey,
      amount: 90_000,
      attachments: [],
      date: Date.now(),
      merchant: "Grey to Bybit",
      tagIds: [],
      toAccountId: bybit,
      toAmount: 89_720,
      transactionCharge: 100,
      type: "transfer",
    }
  );

  expect(await balanceOf(grey)).toBe(500_000 - 90_000 - 100);
  expect(await balanceOf(bybit)).toBe(89_720);
  const transaction = await t.query(api.finance.getTransaction, {
    id: mainTransactionId,
  });
  expect(transaction).toMatchObject({
    amount: -90_000,
    currency: "USD",
    toAmount: 89_720,
    toCurrency: "USDT",
  });
});

test("a cross-currency transfer requires the received amount", async () => {
  const { bybit, grey, t } = await setup();

  await expect(
    t.mutation(api.finance.createTransaction, {
      accountId: grey,
      amount: 90_000,
      attachments: [],
      date: Date.now(),
      merchant: "",
      tagIds: [],
      toAccountId: bybit,
      type: "transfer",
    })
  ).rejects.toThrow("amount received");
});

test("same-currency transfers ignore toAmount", async () => {
  const { balanceOf, grey, t, wise } = await setup();

  await t.mutation(api.finance.createTransaction, {
    accountId: wise,
    amount: 200_000,
    attachments: [],
    date: Date.now(),
    merchant: "Wise to Grey",
    tagIds: [],
    toAccountId: grey,
    toAmount: 1,
    transactionCharge: 113,
    type: "transfer",
  });

  expect(await balanceOf(wise)).toBe(300_000 - 200_000 - 113);
  expect(await balanceOf(grey)).toBe(500_000 + 200_000);
});

test("editing a cross-currency transfer reverses the old received amount", async () => {
  const { balanceOf, bybit, grey, t } = await setup();
  const { mainTransactionId } = await t.mutation(
    api.finance.createTransaction,
    {
      accountId: grey,
      amount: 90_000,
      attachments: [],
      date: Date.now(),
      merchant: "Grey to Bybit",
      tagIds: [],
      toAccountId: bybit,
      toAmount: 89_720,
      type: "transfer",
    }
  );

  await t.mutation(api.finance.updateTransaction, {
    accountId: grey,
    amount: 50_000,
    attachments: [],
    category: "Transfer",
    color: "#8E8E93",
    date: Date.now(),
    id: mainTransactionId,
    merchant: "Grey to Bybit",
    symbol: "arrow.left.arrow.right",
    tagIds: [],
    toAccountId: bybit,
    toAmount: 49_850,
    type: "transfer",
  });

  expect(await balanceOf(grey)).toBe(500_000 - 50_000);
  expect(await balanceOf(bybit)).toBe(49_850);
});

test("deleting a cross-currency transfer restores both balances", async () => {
  const { balanceOf, bybit, grey, t } = await setup();
  const { mainTransactionId } = await t.mutation(
    api.finance.createTransaction,
    {
      accountId: grey,
      amount: 90_000,
      attachments: [],
      date: Date.now(),
      merchant: "Grey to Bybit",
      tagIds: [],
      toAccountId: bybit,
      toAmount: 89_720,
      transactionCharge: 100,
      type: "transfer",
    }
  );

  await t.mutation(api.finance.deleteTransaction, { id: mainTransactionId });

  expect(await balanceOf(grey)).toBe(500_000);
  expect(await balanceOf(bybit)).toBe(0);
});

test("records the incoming leg's external ref on a captured transfer", async () => {
  const { bybit, grey, t } = await setup();

  await t.mutation(api.finance.createTransaction, {
    accountId: grey,
    amount: 89_900,
    attachments: [],
    date: Date.now(),
    externalRef: "grey:REF1",
    merchant: "Grey transfer",
    tagIds: [],
    toAccountId: bybit,
    toAmount: 89_720,
    toExternalRef: "bybit-deposit:DEP1",
    transactionCharge: 100,
    type: "transfer",
  });

  expect(
    await t.query(api.finance.findCapturedExternalRefs, {
      externalRefs: ["grey:REF1", "bybit-deposit:DEP1"],
    })
  ).toEqual(["grey:REF1", "bybit-deposit:DEP1"]);
});
