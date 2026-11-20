import { describe, expect, test } from "vitest";

import { parseCaptureText } from "../../../convex/lib/capture/parser";
import type { Account } from "../finance/types";
import {
  matchCaptureAccounts,
  pickCaptureSourceAccountId,
  preferOwnerAccounts,
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

describe("households with one wallet per person", () => {
  const account = (
    id: string,
    name: string,
    type: Account["type"],
    currency = "GHS"
  ): Account => ({
    balance: 0,
    color: "",
    currency,
    id,
    institution: "",
    name,
    symbol: "",
    type,
  });
  // Mirrors a real family setup: two MoMo wallets, one GhanaPay, Cash.
  const household: Account[] = [
    account("cash", "Cash", "cash"),
    account("tsatsu-momo", "Tsatsu's Momo", "mobile_money"),
    account("vicki-momo", "Vicki's Momo", "mobile_money"),
    account("tsatsu-ghanapay", "Tsatsu’s Ghanapay", "mobile_money"),
    account("tsatsu-fnb", "Tsatsu's FNB", "current"),
  ];
  const parse = (text: string) => {
    const [transaction] = parseCaptureText(text).transactions;
    if (!transaction) {
      throw new Error("Missing test transaction");
    }
    return transaction;
  };

  test("picks the MoMo wallet named after the person using the phone", () => {
    const transaction = parse(GHANAPAY_PUSH);

    expect(
      pickCaptureSourceAccountId(transaction, household, undefined, "cash", [
        "Tsatsu",
      ])
    ).toBe("tsatsu-momo");
    expect(
      pickCaptureSourceAccountId(transaction, household, undefined, "cash", [
        "Vicki",
      ])
    ).toBe("vicki-momo");
    expect(
      matchCaptureAccounts(transaction, household, ["Tsatsu"]).sourceId
    ).toBe("tsatsu-momo");
  });

  test("still asks when the owner can't be told apart", () => {
    expect(
      pickCaptureSourceAccountId(
        parse(GHANAPAY_PUSH),
        household,
        undefined,
        "cash",
        []
      )
    ).toBeNull();
  });

  test("an account the user picked before beats the owner match", () => {
    expect(
      pickCaptureSourceAccountId(
        parse(GHANAPAY_PUSH),
        household,
        "vicki-momo",
        "cash",
        ["Tsatsu"]
      )
    ).toBe("vicki-momo");
  });

  test("Wallet2Bank from MoMo picks the owner's wallet", () => {
    const transaction = parse(
      "Your payment of GHS 200.00 to FNB has been completed at 2026-11-16 12:19:06. Your new balance: GHS 125.64. Fee was GHS 0.00 Tax was GHS -. Reference: -. Financial Transaction Id: 93946978323."
    );

    expect(
      pickCaptureSourceAccountId(transaction, household, "cash", "cash", [
        "Tsatsu",
      ])
    ).toBe("tsatsu-momo");
  });
});

test("preferOwnerAccounts keeps every candidate when none is the owner's", () => {
  const shared: Account[] = [
    { ...accounts[1]!, id: "a", name: "Family Momo" },
    { ...accounts[1]!, id: "b", name: "Business Momo" },
  ];
  expect(
    preferOwnerAccounts(shared, ["Tsatsu"]).map((item) => item.id)
  ).toEqual(["a", "b"]);
});
