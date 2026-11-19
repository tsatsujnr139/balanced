import { describe, expect, test } from "vitest";

import { isConfidentHistory, labelTokens, suggestFromHistory } from "./labels";
import type { LabelExample } from "./labels";

const EXAMPLES: LabelExample[] = [
  {
    category: "Eating Out",
    description: "Boba order",
    direction: "debit",
    tagNames: ["Treats"],
  },
  {
    category: "Eating Out",
    description: "boba delivery",
    direction: "debit",
    tagNames: ["Treats", "Delivery"],
  },
  {
    category: "Utilities",
    description: "ECG prepaid",
    direction: "debit",
    tagNames: ["House"],
  },
  {
    category: "Salary",
    description: "Payment received from ACME LTD",
    direction: "credit",
    tagNames: [],
  },
  {
    category: "Home repairs",
    description: "Water piping work",
    direction: "debit",
    tagNames: ["House"],
  },
];

const draft = (
  description: string,
  direction: "credit" | "debit" = "debit"
) => ({
  description,
  direction,
  key: description,
});

describe("labelTokens", () => {
  test("drops numbers, short words, and boilerplate", () => {
    expect([
      ...labelTokens("Payment received GHS 75.00 from KOFI via 0240000009"),
    ]).toEqual(["kofi"]);
  });
});

describe("suggestFromHistory", () => {
  test("uses the category most similar transactions share", () => {
    const suggestion = suggestFromHistory(draft("Boba order"), EXAMPLES);

    expect(suggestion).toMatchObject({
      category: "Eating Out",
      matches: 2,
      tagNames: ["Treats"],
    });
    expect(suggestion && isConfidentHistory(suggestion)).toBe(true);
  });

  test("matches on counterparty and reference as well", () => {
    expect(
      suggestFromHistory(
        { ...draft("Ama Serwaa"), reference: "ECG top-up" },
        EXAMPLES
      )?.category
    ).toBe("Utilities");
  });

  test("never matches across directions", () => {
    expect(suggestFromHistory(draft("ACME LTD", "debit"), EXAMPLES)).toBeNull();
    expect(
      suggestFromHistory(draft("ACME LTD", "credit"), EXAMPLES)?.category
    ).toBe("Salary");
  });

  test("returns null for unrelated descriptions", () => {
    expect(suggestFromHistory(draft("Customs handling"), EXAMPLES)).toBeNull();
  });

  test("reports low confidence when history disagrees", () => {
    const split = suggestFromHistory(draft("Water order"), [
      ...EXAMPLES,
      {
        category: "Groceries",
        description: "Water order",
        direction: "debit",
        tagNames: [],
      },
    ]);

    expect(split?.confidence).toBeLessThan(1);
  });
});
