import { expect, test } from "vitest";

import { parseCaptureText } from "../../../convex/lib/capture/parser";
import type { Account } from "../finance/types";
import { matchCaptureAccounts } from "./capture-account-matching";

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
