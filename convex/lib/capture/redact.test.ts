import { expect, test } from "vitest";

import { redactSensitive } from "./redact";

test("removes account details and emails but keeps amounts and IDs", () => {
  const text =
    "You sent 2,001.13 USD Transaction number #1000000001 Routing number 000000001 Account number 123456789012 Email jane@example.com Bank name EXAMPLE BANK";

  expect(redactSensitive(text)).toBe(
    "You sent 2,001.13 USD Transaction number #1000000001 Routing number [redacted] Account number [redacted] Email [email] Bank name EXAMPLE BANK"
  );
});

test("removes IBANs", () => {
  expect(redactSensitive("Paid to GB33 BUKB 2020 1555 5555 55")).toBe(
    "Paid to [iban]"
  );
});
