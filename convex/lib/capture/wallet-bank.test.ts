import { expect, test } from "vitest";

import { parseCaptureText } from "./parser";
import { resolveTransfers } from "./transfers";

const SMS =
  "Your payment of GHS 200.00 to FNB has been completed at 2026-11-16 12:19:06. Your new balance: GHS 125.64. Fee was GHS 0.00 Tax was GHS -. Reference: -. Financial Transaction Id: 93946978323. External Transaction Id: 68066137-c740-485e-b23f-8a7e9ddbcc2d.Download the MoMo App for a Faster & Easier Experience Click here: https://mtnmymomo.onelink.me/XJOt/MoMo";

for (const bank of ["FNB", "CAL", "CAL Bank", "First National Bank"]) {
  test(`reads MoMo Wallet2Bank to ${bank} without requiring an owner name or AI`, () => {
    const parsed = parseCaptureText(SMS.replace("to FNB", `to ${bank}`));
    expect(parsed.unparsedSegments).toEqual([]);
    const [transaction] = resolveTransfers(parsed.transactions, []);
    expect(transaction).toMatchObject({
      amount: 20000,
      balanceAfter: 12564,
      currency: "GHS",
      fee: 0,
      externalRef: "mtn_momo:93946978323",
      transactionId: "93946978323",
      direction: "debit",
      provider: "mtn_momo",
      occurredAt: {
        year: 2026,
        month: 11,
        day: 16,
        hour: 12,
        minute: 19,
        second: 6,
      },
      transfer: {
        kind: "Wallet2Bank",
        destinationHint: bank.startsWith("CAL") ? "CAL" : "FNB",
        toCurrency: "GHS",
      },
    });
    expect(transaction?.description).toContain("Wallet2Bank");
    expect(transaction?.reference).toBeUndefined();
  });
}

test("a merchant whose name contains FNB is still spending", () => {
  const parsed = parseCaptureText(SMS.replace("to FNB", "to FNB SCHOOL"));
  expect(
    resolveTransfers(parsed.transactions, [])[0]?.transfer
  ).toBeUndefined();
});

test("pairs the FNB receipt rather than an equal credit at a different bank", () => {
  const [outgoing] = parseCaptureText(SMS).transactions;
  if (!outgoing) {
    throw new Error("Missing test transaction");
  }
  const receipt = {
    ...outgoing,
    direction: "credit" as const,
    transfer: undefined,
    provider: "other" as const,
    externalRef: "cal:receipt",
    institution: "CAL Bank",
  };
  const found = resolveTransfers(
    [
      outgoing,
      receipt,
      {
        ...receipt,
        provider: "fnb",
        externalRef: "fnb:receipt",
        institution: "First National Bank",
      },
    ],
    []
  );
  expect(found).toHaveLength(2);
  expect(found[0]?.pairedLeg?.externalRef).toBe("fnb:receipt");
  expect(found[1]?.externalRef).toBe("cal:receipt");
});

test("keeps the existing provider ref so the same SMS cannot acquire a new identity", () => {
  const [first] = parseCaptureText(SMS).transactions;
  const [second] = parseCaptureText(SMS.replaceAll(" ", "\n")).transactions;
  expect(first?.externalRef).toBe(second?.externalRef);
});
