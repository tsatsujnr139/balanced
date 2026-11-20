/** Exact bank labels used by MoMo's wallet-to-bank confirmation messages. */
const BANK_ALIASES: Record<string, string> = {
  cal: "CAL",
  calbank: "CAL",
  firstnationalbank: "FNB",
  fnb: "FNB",
};
const BANK_LABEL_PUNCTUATION = /[^a-z]/g;
const FNB_ACCOUNT_NAME = /\bfnb\b|\bfirst national bank\b/i;
const CAL_ACCOUNT_NAME = /\bcal(?:bank)?\b/i;

export const walletBankDestination = (label: string): string | undefined =>
  BANK_ALIASES[label.toLowerCase().replace(BANK_LABEL_PUNCTUATION, "")];

export const matchesWalletBank = (bank: string, label: string): boolean => {
  const canonical = walletBankDestination(bank);
  return canonical === "FNB"
    ? FNB_ACCOUNT_NAME.test(label)
    : canonical === "CAL" && CAL_ACCOUNT_NAME.test(label);
};
