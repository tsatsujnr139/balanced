import type { Account } from "./types";

export const OUT_OF_WALLET_ACCOUNT_ID = "__out_of_wallet__";
export const OUT_OF_WALLET_ACCOUNT_NAME = "Out of wallet";

export const OUT_OF_WALLET_ACCOUNT: Account = {
  balance: 0,
  color: "#8E8E93",
  currency: "",
  id: OUT_OF_WALLET_ACCOUNT_ID,
  institution: "External",
  name: OUT_OF_WALLET_ACCOUNT_NAME,
  symbol: "wallet.pass.fill",
  type: "general",
};

export function isOutOfWalletAccountId(accountId: string | null): boolean {
  return accountId === OUT_OF_WALLET_ACCOUNT_ID;
}
