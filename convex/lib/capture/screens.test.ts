import { describe, expect, test } from "vitest";

import { parseAmountToMinorUnits, parseCaptureText } from "./parser";
import { isOwnerName, resolveTransfers } from "./transfers";

// Synthetic app screens laid out the way on-device text recognition returns
// them: same labels as the real apps, made-up names, numbers, and IDs.

const REFERENCE_DATE = new Date(2026, 10, 19, 21, 10);

const BYBIT_ORDERS = `21:06
Orders
Ongoing
Closed
All
Completed
Canceled
Appeal In Progress
Sell USDT
Completed >
Amount
10,000.00 GHS
Price
12.26 GHS
Qty
815.6606 USDT
Order No.
2100000000000000001 L
• MERCHANT_ONE
2026-11-16 12:52:48
Sell USDT
Completed ›
4,800.00 GHS
Amount
Price
12.10 GHS
Qty
396.6942 USDT
Order No.
2100000000000000002
• MERCHANT_TWO
2026-11-09 11:54:02
Sell USDT
Canceled >
Amount
500.00 GHS
Price
12.00 GHS
Qty
41.6667 USDT
Order No.
2100000000000000003
= Some Trader
2026-11-05 10:00:00
Sell USDT
Completed >
Amount
4,850.00 GHS
Price
12.11 GHS
P2P
Orders`;

const MOMO_APP = `21:07
Transaction details
Date and time
17 Nov 2026 |
09:06
Beneficiary
KWAME
KOFI
MENSAH
Transaction ID
90000000002
Status
SUCCESSFUL
To
233200000002
Transaction type
MoMo User
Reference
Water piping work
Amount
GHS 138
Txn Fees
GHS 1.03
Tax
GHS O
Total
GHS 139.03
Share Receipt`;

const WISE = `21:08
Sent
2,000 USD
Jane Doe
General
Updates
Details
Transaction details
You sent
2,001.13 USD
Wise's fees
1.13 USD
You received
2,000 USD
Transaction number
#1000000001
Your bank details
Nickname
Grey
Account holder name
Jane Doe
Bank name
EXAMPLE BANK`;

const GREY = `21:10
·897.20
Sent to Jane Doe
Nov 16, 2026 | 12:42pm
Transaction details
Status
• Completed
Recipient receives
·897.20
Amount sent
$900.00
Transaction fee
-$1.00
Exchange rate
1 USD = 1.00 USDT
Category
• General
Payment channel
Wallet Address
Reference code
REF000TEST
Session ID`;

const parse = (text: string) =>
  parseCaptureText(text, { referenceDate: REFERENCE_DATE });

describe("parseAmountToMinorUnits rounding", () => {
  test.each([
    ["815.6606", 81_566],
    ["396.6942", 39_669],
    ["41.6650", 4167],
    ["0.004", 0],
  ])("%s -> %d", (input, expected) => {
    expect(parseAmountToMinorUnits(input)).toBe(expected);
  });
});

describe("Bybit P2P orders", () => {
  test("reads completed sells as USDT → GHS exchanges", () => {
    const { transactions, unparsedSegments } = parse(BYBIT_ORDERS);

    expect(transactions).toHaveLength(2);
    expect(transactions[0]).toMatchObject({
      amount: 81_566,
      counterpartyName: "MERCHANT_ONE",
      currency: "USDT",
      description: "Sell USDT to MERCHANT_ONE",
      direction: "debit",
      externalRef: "bybit:2100000000000000001",
      occurredAt: { day: 16, hour: 12, minute: 52, month: 11, year: 2026 },
      transfer: { rate: 12.26, toAmount: 1_000_000, toCurrency: "GHS" },
    });
    // The cancelled order and the cut-off order are not transactions, and the
    // cut-off one isn't sent to the AI either.
    expect(unparsedSegments).toEqual([]);
  });
});

describe("MTN MoMo app details", () => {
  test("shares the SMS external ref so both never double up", () => {
    const [transaction] = parse(MOMO_APP).transactions;

    expect(transaction).toMatchObject({
      amount: 13_800,
      counterpartyName: "Kwame Kofi Mensah",
      description: "Water piping work",
      externalRef: "mtn_momo:90000000002",
      fee: 103,
      occurredAt: { day: 17, hour: 9, minute: 6, month: 11, year: 2026 },
    });
    expect(parse(MOMO_APP).unparsedSegments).toEqual([]);
  });
});

describe("Wise", () => {
  test("separates the fee from the amount sent", () => {
    const { transactions, unparsedSegments } = parse(WISE);

    expect(transactions[0]).toMatchObject({
      amount: 200_000,
      counterpartyName: "Jane Doe",
      currency: "USD",
      externalRef: "wise:1000000001",
      fee: 113,
      transfer: { destinationHint: "Grey" },
    });
    expect(unparsedSegments).toEqual([]);
  });
});

describe("Grey", () => {
  test("reads a USD → USDT send with fee and rate", () => {
    const [transaction] = parse(GREY).transactions;

    expect(transaction).toMatchObject({
      amount: 89_900,
      currency: "USD",
      externalRef: "grey:REF000TEST",
      fee: 100,
      occurredAt: { day: 16, hour: 12, minute: 42, month: 11, year: 2026 },
      transfer: { rate: 1, toAmount: 89_720, toCurrency: "USDT" },
    });
  });
});

describe("resolveTransfers", () => {
  const OWNER = ["Jane"];

  test("keeps transfers to the owner and drops them for other people", () => {
    const own = resolveTransfers(parse(GREY).transactions, OWNER);
    const someoneElse = resolveTransfers(parse(GREY).transactions, ["Kwame"]);

    expect(own[0]?.transfer?.toCurrency).toBe("USDT");
    expect(someoneElse[0]?.transfer).toBeUndefined();
  });

  test("treats GhanaPay top-ups from MoMo as transfers", () => {
    const [topUp] = resolveTransfers(
      parse(
        "Your payment of GHS 4500.00 to GHANAPAY PUSH has been completed at 2026-11-17 11:57:24. Your new balance: GHS 5479.11. Fee was GHS 7.50 Tax was GHS -. Reference: -. Financial Transaction Id: 90000000003."
      ).transactions,
      OWNER
    );

    expect(topUp?.transfer?.destinationHint).toBe("Ghanapay Push");
  });

  test("pairs a Bybit sell with the cedi payment that arrived for it", () => {
    const text = `${BYBIT_ORDERS}
Payment received for GHS 10000.00 from MERCHANT ONE PAYER (233200000009) Current Balance: GHS 10125.64 . Available Balance: GHS 10125.64. Reference: 1. Transaction ID: 90000000009. Fee charged: GHS0.00.`;
    const transactions = resolveTransfers(parse(text).transactions, OWNER);

    expect(transactions.map((item) => item.externalRef)).toEqual([
      "bybit:2100000000000000001",
      "bybit:2100000000000000002",
    ]);
    expect(transactions[0]?.pairedLeg).toEqual({
      accountSuffix: undefined,
      externalRef: "mtn_momo:90000000009",
      institution: undefined,
      provider: "mtn_momo",
    });
  });

  test("leaves unrelated credits alone", () => {
    const text = `${WISE}
Payment received for GHS 2000.00 from SOMEONE (233200000010) Current Balance: GHS 2100.00 . Available Balance: GHS 2100.00. Reference: rent. Transaction ID: 90000000010. Fee charged: GHS0.00.`;
    const transactions = resolveTransfers(parse(text).transactions, OWNER);

    // Same number, different currency: not the incoming leg.
    expect(transactions).toHaveLength(2);
    expect(transactions[0]?.pairedLeg).toBeUndefined();
  });
});

describe("isOwnerName", () => {
  test("matches any of the owner's names, case-insensitively", () => {
    expect(isOwnerName("JANE ADJOA DOE", ["Jane"])).toBe(true);
    expect(isOwnerName("Janet Mensah", ["Jane"])).toBe(false);
    expect(isOwnerName(undefined, ["Jane"])).toBe(false);
  });
});

describe("device OCR quirks on app screens", () => {
  test("ignores a copy icon read as an extra digit after the order number", () => {
    const [order] = parse(
      BYBIT_ORDERS.replace("2100000000000000001 L", "21000000000000000019")
    ).transactions;

    expect(order?.externalRef).toBe("bybit:2100000000000000001");
  });

  test("skips labels OCR places between Grey's reference label and value", () => {
    const reordered = GREY.replace(
      "Reference code\nREF000TEST\nSession ID",
      "Reference code\nSession ID\nREF000TEST1"
    );

    expect(parse(reordered).transactions[0]?.externalRef).toBe(
      "grey:REF000TEST1"
    );
  });
});
