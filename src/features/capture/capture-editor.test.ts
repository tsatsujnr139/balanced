/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "../../../convex/_generated/api";
import { normalizeModelTransactions } from "../../../convex/lib/capture/model";
import { resolveTransfers } from "../../../convex/lib/capture/transfers";
import schema from "../../../convex/schema";
import {
  calculateExchangeRate,
  calculateReceivedAmount,
} from "../finance/transfer-amounts";
import type { CaptureDraft } from "./capture-context";
import {
  applyCaptureForm,
  captureDraftToCreateArgs,
  captureDraftToForm,
} from "./capture-editor";

const modules = import.meta.glob([
  "../../../convex/**/*.ts",
  "!../../../convex/**/*.test.ts",
]);
const notification =
  "Grey sent USD 100.00 to my wallet. Received 99.50 USDT. Fee 1.00 USD.";
const scanned = (): CaptureDraft => ({
  accountId: null,
  category: null,
  continuity: "unknown",
  date: 1234,
  key: "grey:scan-test",
  selected: true,
  tags: [],
  toAccountId: null,
  captured: {
    reader: "on-device",
    sourceImageUri: "file:///receipt.png",
    transaction: {
      amount: 10000,
      currency: "USD",
      description: "Scanned payment",
      direction: "debit",
      fee: 100,
      externalRef: "grey:scan-test",
      provider: "grey",
      sourceText: notification,
    },
  },
});

for (const currency of ["USDT", "GHS"]) {
  test(`a scanned expense can be edited into a USD to ${currency} transfer and saved with both balances correct`, async () => {
    const t = convexTest(schema, modules);
    const { source, destination } = await t.run(async (ctx) => {
      const fields = {
        balance: 0,
        color: "#000000",
        institution: "",
        order: 0,
        symbol: "banknote",
        type: "general" as const,
      };
      const sourceId = await ctx.db.insert("accounts", {
        ...fields,
        balance: 50000,
        currency: "USD",
        name: "Source",
      });
      const destinationId = await ctx.db.insert("accounts", {
        ...fields,
        currency,
        name: "Destination",
      });
      return {
        source: {
          ...fields,
          id: sourceId,
          balance: 50000,
          currency: "USD",
          name: "Source",
        },
        destination: {
          ...fields,
          id: destinationId,
          currency,
          name: "Destination",
        },
      };
    });
    const draft = scanned();
    const form = captureDraftToForm(draft, [
      { uri: "file:///receipt.png", name: "receipt.png" },
    ]);
    expect(form.attachments).toHaveLength(1);
    const received = calculateReceivedAmount(
      "100.00",
      currency === "USDT" ? "0.995" : "12.26"
    );
    const edited = applyCaptureForm(
      draft,
      {
        ...form,
        accountId: source.id,
        toAccountId: destination.id,
        transactionTypeIndex: 2,
        narration: "My wallet exchange",
        amount: "100.00",
        toAmount: received,
        transactionCharge: "1.00",
        date: 5678,
        attachments: [],
      },
      [source, destination]
    );
    // Edits never mutate the original or save early.
    expect(draft.captured.transaction.transfer).toBeUndefined();
    expect(edited.captured.transaction.transfer).toMatchObject({
      toCurrency: currency,
      toAmount: Number(received) * 100,
    });
    // Removed screenshot stays removed.
    expect(captureDraftToForm(edited, []).attachments).toEqual([]);
    const args = captureDraftToCreateArgs(edited, new Set());
    const result = await t.mutation(api.finance.createTransaction, {
      ...args,
      attachments: [],
    });
    const saved = await t.query(api.finance.getTransaction, {
      id: result.mainTransactionId,
    });
    expect(saved).toMatchObject({
      amount: -10000,
      currency: "USD",
      toAmount: Number(received) * 100,
      toCurrency: currency,
      merchant: "My wallet exchange",
      transactionChargeAmount: 100,
    });
    const balances = await t.run(async (ctx) => [
      (await ctx.db.get("accounts", source.id))?.balance,
      (await ctx.db.get("accounts", destination.id))?.balance,
    ]);
    expect(balances).toEqual([39900, Math.round(Number(received) * 100)]);
    const pairId = await t.run(
      async (ctx) =>
        (await ctx.db.get("transactions", result.mainTransactionId))
          ?.pairTransactionId
    );
    expect(pairId).toBeDefined();
    const fromReceipt = await t.query(api.finance.getTransaction, {
      id: pairId!,
    });
    expect(fromReceipt).toMatchObject({
      amount: -10000,
      currency: "USD",
      toAmount: Number(received) * 100,
      toCurrency: currency,
    });
    await expect(
      t.mutation(api.finance.createTransaction, { ...args, attachments: [] })
    ).rejects.toThrow();
  });
}

test("rate edits calculate received amounts and invalid input never produces NaN", () => {
  expect(calculateReceivedAmount("100", "12.26")).toBe("1226.00");
  expect(calculateReceivedAmount("200", "0.995")).toBe("199.00");
  expect(calculateExchangeRate("100", "1226")).toBe("12.26");
  expect(calculateReceivedAmount("100", "")).toBe("");
  expect(calculateReceivedAmount("100", "-1")).toBe("");
  expect(calculateExchangeRate("0", "10")).toBe("");
});

test("model reads retain the currency and verified received amount", () => {
  const [transaction] = normalizeModelTransactions(
    [
      {
        amount: "100.00",
        currency: "USD",
        direction: "debit",
        toAmount: "99.50",
        toCurrency: "USDT",
      },
    ],
    notification
  );
  expect(transaction).toMatchObject({
    currency: "USD",
    amount: 10000,
    transfer: { toAmount: 9950, toCurrency: "USDT", rate: 0.995 },
  });
  const [unverified] = normalizeModelTransactions(
    [
      {
        amount: "100.00",
        currency: "USD",
        direction: "debit",
        toAmount: "9999",
        toCurrency: "USDT",
      },
    ],
    notification
  );
  expect(unverified?.transfer).toBeUndefined();
});

test("an exchange to an explicitly owned wallet remains a transfer without a recipient name", () => {
  const text = "Converted USD 100.00 to my USDT wallet. Received 99.50 USDT.";
  const transactions = normalizeModelTransactions(
    [
      {
        amount: "100.00",
        currency: "USD",
        direction: "debit",
        toAmount: "99.50",
        toCurrency: "USDT",
        sourceText: text,
      },
    ],
    text
  );
  expect(resolveTransfers(transactions, [])[0]?.transfer).toMatchObject({
    toCurrency: "USDT",
    toAmount: 9950,
  });
  const payment = transactions.map((transaction) => ({
    ...transaction,
    counterpartyName: "Other person",
    sourceText: "Paid another person USD 100.00. They received 99.50 USDT.",
  }));
  expect(resolveTransfers(payment, [])[0]?.transfer).toBeUndefined();
});
