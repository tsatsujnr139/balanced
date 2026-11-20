import { expect, test } from "vitest";

import { parseCaptureText } from "../../../convex/lib/capture/parser";
import type { Account } from "../finance/types";
import {
  matchCaptureAccounts,
  pickCaptureSourceAccountId,
} from "./capture-account-matching";

const accounts: Account[] = [
  {
    id: "cash",
    name: "Cash",
    institution: "Cash",
    currency: "GHS",
    balance: 0,
    color: "",
    symbol: "",
    type: "cash",
  },
  {
    id: "momo",
    name: "Tsatsu MoMo",
    institution: "MTN",
    currency: "GHS",
    balance: 0,
    color: "",
    symbol: "",
    type: "mobile_money",
  },
  {
    id: "fnb",
    name: "Tsatsu FNB",
    institution: "",
    currency: "GHS",
    balance: 0,
    color: "",
    symbol: "",
    type: "current",
  },
  {
    id: "cal",
    name: "Savings",
    institution: "CAL Bank",
    currency: "GHS",
    balance: 0,
    color: "",
    symbol: "",
    type: "savings",
  },
  {
    id: "fnb-usd",
    name: "FNB USD",
    institution: "",
    currency: "USD",
    balance: 0,
    color: "",
    symbol: "",
    type: "current",
  },
];

for (const bank of ["FNB", "CAL"]) {
  test(`suggests MoMo as source and the ${bank} GHS account as destination`, () => {
    const [transaction] = parseCaptureText(
      `Your payment of GHS 200.00 to ${bank} has been completed at 2026-11-16 12:19:06. Your new balance: GHS 125.64. Fee was GHS 0.00 Tax was GHS -. Reference: -. Financial Transaction Id: 93946978323.`
    ).transactions;
    if (!transaction) {
      throw new Error("Missing test transaction");
    }
    expect(matchCaptureAccounts(transaction, accounts)).toEqual({
      sourceId: "momo",
      destinationIds: [bank.toLowerCase()],
    });
    expect(
      matchCaptureAccounts(
        transaction,
        accounts.filter((account) => account.id !== bank.toLowerCase())
      ).destinationIds
    ).toEqual([]);
  });
}

const GHANAPAY_PUSH =
  "Your payment of GHS 4500.00 to GHANAPAY PUSH has been completed at 2026-11-17 11:57:24. Your new balance: GHS 5479.11. Fee was GHS 7.50 Tax was GHS -. Reference: -. Financial Transaction Id: 94019968818. External Transaction Id: 94019968818.Download the MoMo App for a Faster & Easier Experience Click here: https://mtnmymomo.onelink.me/XJOt/MoMo";

test("MoMo evidence overrides a remembered Cash mapping for GhanaPay PUSH", async () => {
  const { resolveTransfers } =
    await import("../../../convex/lib/capture/transfers");
  const [transaction] = resolveTransfers(
    parseCaptureText(GHANAPAY_PUSH).transactions,
    []
  );
  if (!transaction) {
    throw new Error("Missing test transaction");
  }
  const wallets: Account[] = [
    ...accounts,
    {
      id: "ghanapay",
      name: "GhanaPay",
      institution: "",
      currency: "GHS",
      balance: 0,
      color: "",
      symbol: "",
      type: "mobile_money",
    },
  ];
  expect(transaction).toMatchObject({
    amount: 450000,
    fee: 750,
    transfer: { destinationHint: "Ghanapay Push" },
  });
  expect(pickCaptureSourceAccountId(transaction, wallets, "cash", "cash")).toBe(
    "momo"
  );
  expect(matchCaptureAccounts(transaction, wallets).destinationIds).toEqual([
    "ghanapay",
  ]);
  expect(
    pickCaptureSourceAccountId(
      transaction,
      wallets.filter((account) => account.id !== "momo"),
      "cash",
      "cash"
    )
  ).toBeNull();
});

test("MobileMoney without a space is recognised as the MoMo source", () => {
  const [transaction] = parseCaptureText(GHANAPAY_PUSH).transactions;
  if (!transaction) {
    throw new Error("Missing test transaction");
  }
  const wallets = accounts.map((account) =>
    account.id === "momo"
      ? { ...account, name: "MobileMoney", institution: "" }
      : account
  );
  expect(pickCaptureSourceAccountId(transaction, wallets, "cash", "cash")).toBe(
    "momo"
  );
});

test("ordinary MoMo spending also overrides a stale Cash mapping", () => {
  const [transaction] = parseCaptureText(
    GHANAPAY_PUSH.replace("GHANAPAY PUSH", "PAPAYE")
  ).transactions;
  if (!transaction) {
    throw new Error("Missing test transaction");
  }
  expect(
    pickCaptureSourceAccountId(transaction, accounts, "cash", "cash")
  ).toBe("momo");
});

test("model-read notifications naming MobileMoney also use MoMo rather than Cash", () => {
  const [parsed] = parseCaptureText(GHANAPAY_PUSH).transactions;
  if (!parsed) {
    throw new Error("Missing test transaction");
  }
  const transaction = {
    ...parsed,
    provider: "other" as const,
    institution: "MobileMoney",
  };
  expect(
    pickCaptureSourceAccountId(transaction, accounts, "cash", "cash")
  ).toBe("momo");
});
