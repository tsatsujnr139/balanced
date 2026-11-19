/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { ConvexError } from "convex/values";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);

const setup = async () => {
  const t = convexTest(schema, modules);
  const accountId: Id<"accounts"> = await t.run(
    async (ctx) =>
      await ctx.db.insert("accounts", {
        balance: 500_000,
        color: "#FFCC00",
        currency: "GHS",
        institution: "MTN",
        name: "MoMo",
        order: 0,
        symbol: "iphone",
        type: "mobile_money",
      })
  );
  const create = (externalRef?: string) =>
    t.mutation(api.finance.createTransaction, {
      accountId,
      amount: 13_800,
      attachments: [],
      date: Date.now(),
      externalRef,
      merchant: "Water piping work",
      tagIds: [],
      transactionCharge: 103,
      type: "expense",
    });
  return { accountId, create, t };
};

test("stores the external ref on the main transaction only", async () => {
  const { create, t } = await setup();

  const { mainTransactionId, transactionChargeId } = await create(
    "mtn_momo:90000000002"
  );

  const [main, charge] = await t.run(async (ctx) => [
    await ctx.db.get("transactions", mainTransactionId),
    transactionChargeId
      ? await ctx.db.get("transactions", transactionChargeId)
      : null,
  ]);
  expect(main?.externalRef).toBe("mtn_momo:90000000002");
  expect(charge?.transactionKind).toBe("charge");
  expect(charge?.externalRef).toBeUndefined();
});

test("rejects a second transaction with the same external ref", async () => {
  const { accountId, create, t } = await setup();
  await create("mtn_momo:90000000002");

  const duplicate = create(" mtn_momo:90000000002 ");

  await expect(duplicate).rejects.toThrow(ConvexError);
  const account = await t.run(
    async (ctx) => await ctx.db.get("accounts", accountId)
  );
  // Only the first capture moved the balance: 5000.00 - 138.00 - 1.03.
  expect(account?.balance).toBe(486_097);
});

test("transactions without an external ref are never treated as duplicates", async () => {
  const { create } = await setup();

  await create();

  await expect(create()).resolves.toBeDefined();
});

test("reports which refs were already captured", async () => {
  const { create, t } = await setup();
  await create("ghanapay:600000000002");

  const found = await t.query(api.finance.findCapturedExternalRefs, {
    externalRefs: [
      "ghanapay:600000000002",
      "ghanapay:600000000003",
      "ghanapay:600000000002",
    ],
  });

  expect(found).toEqual(["ghanapay:600000000002"]);
});

test("a deleted transaction can be captured again", async () => {
  const { create, t } = await setup();
  const { mainTransactionId } = await create("ghanapay:600000000004");

  await t.mutation(api.finance.deleteTransaction, { id: mainTransactionId });

  await expect(create("ghanapay:600000000004")).resolves.toBeDefined();
});
