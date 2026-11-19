import { describe, expect, test } from "vitest";

import {
  captureDateTimeToEpoch,
  checkBalanceContinuity,
  parseAmountToMinorUnits,
  parseCaptureText,
} from "./parser";

// Synthetic fixtures: same wording and layout as real notifications, made-up
// names, numbers, and IDs. Line breaks mimic on-device text recognition.

// Thursday 19 Nov 2026, 20:06.
const REFERENCE_DATE = new Date(2026, 10, 19, 20, 6);

const GHANAPAY_SCREENSHOT = `20:06
21
transferred GHS 32.00 to
0240000001 MTN MOBILE MONEY. Ref:
GhanaPay
battery delivery. Transaction ID:
600000000001. Balance: GHS 2999.03.
Yesterday 12:28
You have transferred GHS 600.00 to
0240000002 MTN MOBILE MONEY. Ref:
customs handling. Transaction ID:
600000000002. Balance: GHS 2399.03.
Yesterday 13:36
You have transferred GHS 48.00 to
0240000003 MTN MOBILE MONEY. Ref:
coconut water. Transaction ID:
600000000003. Balance: GHS 2351.03.
Yesterday 15:18
You have transferred GHS 360.00 to
0240000004 MTN MOBILE MONEY. Ref:
essentials bag. Transaction ID:
600000000004. Balance: GHS 1991.03.
Today 15:58
You have transferred GHS 100.00 to
0240000005 MTN MOBILE MONEY. Ref:
Boba order. Transaction ID:
600000000005. Balance: GHS 1891.03.
You have transferred GHS 27.00 to
0200000006 TELECEL CASH. Ref: boba
delivery. Transaction ID: 600000000006.
Balance: GHS 1864.03.
Track Order
Text Message • SMS`;

const MOMO_SCREENSHOT = `20:07
15
completed at 2026-11-16 12:19:06.
Your new balance: GHS Fee was
GHS 0.00 Tax wa MobileMoney
Financial Transaction id: 90000000000.
External Transaction Id: 00000000-
0000-0000-0000-000000000000.Download the
MoMo App for a Faster & Easier
Experience Click here: https://
example.com/momo
Payment received for GHS 10000.00
from JANE  AMA DOE
(233200000001) Current Balance: GHS
10125.64 . Available Balance: GHS
10125.64. Reference: 1. Transaction ID:
90000000001. Fee charged: GHS0.00.
Tuesday 09:06
Payment made for GHS 138.00 to
KWAME KOFI MENSAH
Current Balance: GHS 9986.61 .
Available Balance: GHS 9986.61.
Reference: Water piping work.
Transaction ID: 90000000002. Fee
charged: GHS1.03 Tax charged: 0.
Download the MoMo App for a Faster &
Easier Experience. Click here: https://
example.com/momo
Tuesday 11:57
Your payment of GHS 4500.00 to
GHANAPAY PUSH has been completed
at 2026-11-17 11:57:24. Your new
balance: GHS 5479.11. Fee was GHS 7.50
Tax was GHS -. Reference: -. Financial
Transaction Id: 90000000003. External
Transaction Id: 90000000003.Download
the MoMo App for a Faster & Easier
Experience Click here: https://
Text Message • SMS
Tuesday 15:47`;

const FNB_SCREENSHOT = `20:07
11
to stay connected FirNatBank
Stay tuned for exciting updates, news,
offers and everything happening at First
National Bank.
Let's get there together!
#HelpChangesEverything
Monday 12:16
Dear valued customer, GHS 200.00 paid
to your First National Bank Platinum
Lifestyle Cheque... *********1234
@EFT. ... Payment Details
PI000000AAAAAAAA Account balance
is GHS 441.75 as at 16 NOV 2026 12:14
Dear valued customer, GHS 370.00DR
paid from your First National Bank
Platinum Lifestyle
Cheque...*********1234 @EFT. ...
Payment Details Account balance is
GHS 71.75 as at 16 NOV 2026 12:56
Yesterday 13:07
Dear valued customer, GHS 1,000.00
paid to your First National Bank Platinum
Lifestyle Cheque... *********1234
@EFT. ... Payment Details
PI000000BBBBBBBB Account balance is
GHS 1,071.75 as at 18 NOV 2026 13:07
Dear valued customer, GHS 350.00DR
paid from your First National Bank
Platinum Lifestyle
Cheque...*********1234 @EFT. ...
Payment Details Account balance is
GHS 721.75 as at 18 NOV 2026 13:08`;

const parse = (text: string) =>
  parseCaptureText(text, { referenceDate: REFERENCE_DATE });

describe("parseAmountToMinorUnits", () => {
  test.each([
    ["600.00", 60_000],
    ["1,071.75", 107_175],
    ["10000.00", 1_000_000],
    ["1.03", 103],
    ["7.5", 750],
    ["0", 0],
  ])("%s -> %d", (input, expected) => {
    expect(parseAmountToMinorUnits(input)).toBe(expected);
  });
});

describe("GhanaPay transfers", () => {
  test("extracts every complete message and skips the cut-off one", () => {
    const { transactions } = parse(GHANAPAY_SCREENSHOT);

    expect(transactions.map((transaction) => transaction.externalRef)).toEqual([
      "ghanapay:600000000002",
      "ghanapay:600000000003",
      "ghanapay:600000000004",
      "ghanapay:600000000005",
      "ghanapay:600000000006",
    ]);
  });

  test("reads amount, reference, counterparty, and balance", () => {
    const { transactions } = parse(GHANAPAY_SCREENSHOT);
    const [first] = transactions;
    const [last] = transactions.slice(-1);

    expect(first).toMatchObject({
      amount: 60_000,
      balanceAfter: 239_903,
      counterpartyAccount: "0240000002",
      counterpartyName: "MTN MOBILE MONEY",
      description: "customs handling",
      direction: "debit",
      fee: 0,
      provider: "ghanapay",
      transactionId: "600000000002",
    });
    expect(last).toMatchObject({
      amount: 2700,
      counterpartyName: "TELECEL CASH",
      description: "boba delivery",
    });
  });

  test("dates messages from the nearest preceding thread timestamp", () => {
    const { transactions } = parse(GHANAPAY_SCREENSHOT);
    const [first] = transactions;
    const [today, sameBubbleGroup] = transactions.slice(3);

    expect(first?.occurredAt).toEqual({
      day: 18,
      hour: 12,
      minute: 28,
      month: 11,
      second: 0,
      year: 2026,
    });
    expect(first?.occurredAtSource).toBe("thread");
    expect(today?.occurredAt).toMatchObject({ day: 19, hour: 15, minute: 58 });
    expect(sameBubbleGroup?.occurredAt).toMatchObject({
      day: 19,
      hour: 15,
      minute: 58,
    });
  });

  test("balances chain without gaps", () => {
    const { transactions } = parse(GHANAPAY_SCREENSHOT);

    expect(checkBalanceContinuity(transactions)).toEqual([
      "unknown",
      "consistent",
      "consistent",
      "consistent",
      "consistent",
    ]);
  });

  test("flags the cut-off message as unparsed text", () => {
    const { unparsedSegments } = parse(GHANAPAY_SCREENSHOT);

    expect(unparsedSegments).toHaveLength(1);
    expect(unparsedSegments[0]).toContain("GHS 32.00");
  });
});

describe("MTN MoMo", () => {
  test("parses received, made, and completed payments", () => {
    const { transactions } = parse(MOMO_SCREENSHOT);

    expect(transactions).toHaveLength(3);
    expect(transactions[0]).toMatchObject({
      amount: 1_000_000,
      balanceAfter: 1_012_564,
      counterpartyAccount: "233200000001",
      counterpartyName: "Jane Ama Doe",
      description: "Jane Ama Doe",
      direction: "credit",
      externalRef: "mtn_momo:90000000001",
      fee: 0,
      provider: "mtn_momo",
    });
    expect(transactions[0]?.reference).toBeUndefined();
    expect(transactions[1]).toMatchObject({
      amount: 13_800,
      balanceAfter: 998_661,
      counterpartyName: "Kwame Kofi Mensah",
      description: "Water piping work",
      direction: "debit",
      externalRef: "mtn_momo:90000000002",
      fee: 103,
    });
    expect(transactions[2]).toMatchObject({
      amount: 450_000,
      balanceAfter: 547_911,
      counterpartyName: "Ghanapay Push",
      direction: "debit",
      externalRef: "mtn_momo:90000000003",
      fee: 750,
      occurredAt: {
        day: 17,
        hour: 11,
        minute: 57,
        month: 11,
        second: 24,
        year: 2026,
      },
      occurredAtSource: "message",
    });
  });

  test("uses the thread timestamp when the message has no date", () => {
    const [, paymentMade] = parse(MOMO_SCREENSHOT).transactions;

    expect(paymentMade?.occurredAt).toMatchObject({
      day: 17,
      hour: 9,
      minute: 6,
      month: 11,
    });
  });

  test("balance continuity includes fees", () => {
    const { transactions } = parse(MOMO_SCREENSHOT);

    expect(checkBalanceContinuity(transactions)).toEqual([
      "unknown",
      "consistent",
      "consistent",
    ]);
  });
});

describe("on-device OCR quirks", () => {
  // Shapes seen from Vision on real screenshots: a dropped "(", a stray "Fee"
  // line break, a missing trailing period, and a cut-off message on top.
  const OCR_TEXT = `20:07 g
73
npleted at 202
12:19:06.
Your new balance; GHS
Payment received for GHS 10000.00
from JANE AMA DOE
233200000001) Current Balance: GHS
10125.64 . Available Balance: GHS
10125.64. Reference: 1. Transaction ID:
90000000001. Fee charged: GHS0.00.
Tuesday 09:06
Payment made for GHS 138.00 to
KWAME KOFI MENSAH
Current Balance: GHS 9986.61 .
Available Balance: GHS 9986.61.
Reference: Water piping work.
Transaction ID: 90000000002.
Fee
charged: GHS1.03 Tax charged: 0
Download the MoMo App`;

  test("still reads the counterparty without the opening parenthesis", () => {
    const [received] = parse(OCR_TEXT).transactions;

    expect(received).toMatchObject({
      counterpartyAccount: "233200000001",
      counterpartyName: "Jane Ama Doe",
    });
  });

  test("dates the message from the weekday separator", () => {
    const [, paymentMade] = parse(OCR_TEXT).transactions;

    expect(paymentMade).toMatchObject({
      fee: 103,
      occurredAt: { day: 17, hour: 9, minute: 6, month: 11, year: 2026 },
    });
  });
});

describe("First National Bank", () => {
  test("parses credits and DR debits, with and without payment details", () => {
    const { transactions } = parse(FNB_SCREENSHOT);

    expect(transactions).toHaveLength(4);
    expect(transactions[0]).toMatchObject({
      accountSuffix: "1234",
      amount: 20_000,
      balanceAfter: 44_175,
      description: "EFT received",
      direction: "credit",
      externalRef: "fnb:1234:credit:20000:44175:2026-11-16T12:14",
      provider: "fnb",
      reference: "PI000000AAAAAAAA",
    });
    expect(transactions[1]).toMatchObject({
      amount: 37_000,
      description: "EFT payment",
      direction: "debit",
      externalRef: "fnb:1234:debit:37000:7175:2026-11-16T12:56",
    });
    expect(transactions[1]?.reference).toBeUndefined();
    expect(transactions[2]).toMatchObject({
      amount: 100_000,
      balanceAfter: 107_175,
    });
  });

  test("uses the date printed in the message over the thread timestamp", () => {
    const [first] = parse(FNB_SCREENSHOT).transactions;

    expect(first?.occurredAt).toEqual({
      day: 16,
      hour: 12,
      minute: 14,
      month: 11,
      second: 0,
      year: 2026,
    });
    expect(first?.occurredAtSource).toBe("message");
  });

  test("detects a missing message between balances", () => {
    const { transactions } = parse(FNB_SCREENSHOT);
    const withoutSecond = transactions.filter((_, index) => index !== 1);

    expect(checkBalanceContinuity(transactions)).toEqual([
      "unknown",
      "consistent",
      "consistent",
      "consistent",
    ]);
    expect(checkBalanceContinuity(withoutSecond)).toEqual([
      "unknown",
      "gap",
      "consistent",
    ]);
  });

  test("ignores promotional messages", () => {
    expect(parse(FNB_SCREENSHOT).unparsedSegments).toEqual([]);
  });
});

describe("re-captures", () => {
  test("produce identical external refs", () => {
    const refs = (text: string) =>
      parse(text).transactions.map((transaction) => transaction.externalRef);

    // A later screenshot of the same thread, laid out differently.
    const reflowed = FNB_SCREENSHOT.replaceAll("\n", " ").replaceAll(
      "Monday 12:16",
      "Mon, 16 Nov at 12:16"
    );

    expect(refs(reflowed)).toEqual(refs(FNB_SCREENSHOT));
  });

  test("the same message pasted twice yields one transaction", () => {
    const message =
      "You have transferred GHS 48.00 to 0240000003 MTN MOBILE MONEY. Ref: coconut water. Transaction ID: 600000000003. Balance: GHS 2351.03.";

    expect(parse(`${message}\n${message}`).transactions).toHaveLength(1);
  });
});

describe("pasted single messages", () => {
  test("a message without any timestamp has no date", () => {
    const [transaction] = parse(
      "You have transferred GHS 48.00 to 0240000003 MTN MOBILE MONEY. Ref: coconut water. Transaction ID: 600000000003. Balance: GHS 2351.03."
    ).transactions;

    expect(transaction?.occurredAt).toBeUndefined();
  });

  test("unknown formats are reported for the AI fallback", () => {
    const result = parse(
      "Your account has been debited with GHS 50.00 for airtime."
    );

    expect(result.transactions).toEqual([]);
    expect(result.unparsedSegments).toHaveLength(1);
  });
});

describe("captureDateTimeToEpoch", () => {
  test("uses the device time zone", () => {
    expect(
      captureDateTimeToEpoch({
        day: 17,
        hour: 11,
        minute: 57,
        month: 11,
        second: 24,
        year: 2026,
      })
    ).toBe(new Date(2026, 10, 17, 11, 57, 24).getTime());
  });
});
