import { matchesWalletBank } from "../../../convex/lib/capture/banks";
import type { CapturedTransfer } from "../../../convex/lib/capture/transfers";
import type { Account } from "../finance/types";

const MOMO_ACCOUNT = /\bmomo\b|\bmtn\b|\bmobile money\b/i;

/** Avoid guessing when several accounts match the same wallet or bank. */
export const matchCaptureAccounts = (
  transaction: CapturedTransfer,
  accounts: Account[]
) => {
  const sources =
    transaction.provider === "mtn_momo"
      ? accounts.filter(
          (account) =>
            account.currency === transaction.currency &&
            MOMO_ACCOUNT.test(`${account.name} ${account.institution}`)
        )
      : [];
  const destinations =
    transaction.transfer?.kind === "Wallet2Bank"
      ? accounts.filter(
          (account) =>
            account.currency ===
              (transaction.transfer?.toCurrency ?? transaction.currency) &&
            matchesWalletBank(
              transaction.transfer?.destinationHint ?? "",
              `${account.name} ${account.institution}`
            )
        )
      : [];
  return {
    sourceId: sources.length === 1 ? sources[0]?.id : undefined,
    destinationIds: destinations.map((account) => account.id),
  };
};
