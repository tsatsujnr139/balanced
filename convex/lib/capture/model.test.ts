import { describe, expect, test } from "vitest";

import { normalizeModelTransactions } from "./model";

const SOURCE = `Your account 0012 was debited GHS 1,250.50 for ECG prepaid on 2026-11-18 09:15. Charge GHS 2.00. Avail bal GHS 3,400.25. Ref TX-99812.
Airtime purchase of GHS 20.00 successful.`;

describe("normalizeModelTransactions", () => {
  test("keeps verified fields and builds a stable ref from the transaction ID", () => {
    const [transaction] = normalizeModelTransactions(
      [
        {
          amount: "1,250.50",
          balanceAfter: "3400.25",
          counterparty: " ECG  prepaid ",
          direction: "Debit",
          fee: "GHS 2.00",
          institution: "Example Bank",
          occurredAt: "2026-11-18 09:15",
          reference: "",
          sourceText: "Your account 0012 was debited ...",
          summary: "ECG prepaid",
          transactionId: "TX-99812",
        },
      ],
      SOURCE
    );

    expect(transaction).toMatchObject({
      amount: 125_050,
      balanceAfter: 340_025,
      counterpartyName: "ECG prepaid",
      description: "ECG prepaid",
      direction: "debit",
      externalRef: "txn:TX-99812",
      fee: 200,
      institution: "Example Bank",
      occurredAt: { day: 18, hour: 9, minute: 15, month: 11, year: 2026 },
      occurredAtSource: "message",
      provider: "other",
    });
    expect(transaction?.reference).toBeUndefined();
  });

  test("drops transactions whose amount is not printed in the text", () => {
    const result = normalizeModelTransactions(
      [
        { amount: "1250.00", direction: "debit" },
        { amount: "20.00", direction: "debit", summary: "Airtime" },
      ],
      SOURCE
    );

    expect(result.map((transaction) => transaction.amount)).toEqual([2000]);
  });

  test("drops unknown directions and unparseable amounts", () => {
    expect(
      normalizeModelTransactions(
        [
          { amount: "20.00", direction: "sideways" },
          { amount: "twenty", direction: "debit" },
          { amount: "0", direction: "debit" },
        ],
        SOURCE
      )
    ).toEqual([]);
  });

  test("discards an invented balance or fee instead of the transaction", () => {
    const [transaction] = normalizeModelTransactions(
      [
        {
          amount: "20.00",
          balanceAfter: "999.99",
          direction: "debit",
          fee: "5.00",
        },
      ],
      SOURCE
    );

    expect(transaction?.balanceAfter).toBeUndefined();
    expect(transaction?.fee).toBe(0);
  });

  test("ignores invalid dates", () => {
    const [transaction] = normalizeModelTransactions(
      [{ amount: "20.00", direction: "debit", occurredAt: "2026-13-40 25:00" }],
      SOURCE
    );

    expect(transaction?.occurredAt).toBeUndefined();
  });

  test("builds the same composite ref for repeated output without an ID", () => {
    const item = {
      amount: "20.00",
      direction: "debit",
      institution: "MTN",
      summary: "Airtime",
    };

    const result = normalizeModelTransactions([item, { ...item }], SOURCE);

    expect(result).toHaveLength(1);
    expect(result[0]?.externalRef).toBe("model:mtn:debit:2000::");
  });
});

describe("cross-source refs", () => {
  test("uses the provider prefix so AI and pattern reads share a ref", () => {
    const [transaction] = normalizeModelTransactions(
      [
        {
          amount: "20.00",
          currency: "ghs",
          direction: "debit",
          institution: "MTN Mobile Money",
          transactionId: "90000000002",
        },
      ],
      SOURCE
    );

    expect(transaction).toMatchObject({
      currency: "GHS",
      externalRef: "mtn_momo:90000000002",
    });
  });

  test("keeps non-cedi currencies", () => {
    const [transaction] = normalizeModelTransactions(
      [{ amount: "20.00", currency: "USDT", direction: "credit" }],
      SOURCE
    );

    expect(transaction?.currency).toBe("USDT");
  });
});
