/**
 * Removes identifiers the cloud model never needs (account and routing
 * numbers, emails, IBANs) before text leaves the phone. Amounts, dates,
 * names, and transaction IDs are kept: they are what the model reads.
 */

const LABELLED_IDENTIFIER =
  /\b(?<label>Account number|Acct(?:\.|ount)? ?(?:no\.?|number)|Routing number|Sort code|Card number)\s*:?\s*\d[\d -]{3,}\d/gi;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const IBAN = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){2,7}(?: ?[A-Z0-9]{1,3})?\b/g;

export const redactSensitive = (text: string): string =>
  text
    .replace(EMAIL, "[email]")
    .replace(IBAN, "[iban]")
    .replace(
      LABELLED_IDENTIFIER,
      (_match, label: string) => `${label} [redacted]`
    );
