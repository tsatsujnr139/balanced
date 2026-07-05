import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";

import { useAddTransaction } from "@/features/finance/add-transaction-context";
import { AccountPickerScreen } from "@/features/finance/components/account-picker-screen";
import {
  OUT_OF_WALLET_ACCOUNT,
  OUT_OF_WALLET_ACCOUNT_ID,
} from "@/features/finance/out-of-wallet";
import { useFinance } from "@/features/finance/use-finance";

export default function TransactionAccountScreen() {
  const { field } = useLocalSearchParams<{
    field?: "from" | "to" | string | string[];
  }>();
  const accountField = Array.isArray(field) ? field[0] : field;
  const { accounts } = useFinance();
  const { accountId, setAccountId, setToAccountId, toAccountId } =
    useAddTransaction();
  const selectedAccountId = accountField === "to" ? toAccountId : accountId;
  const trackedAccountOptions =
    accountField === "to"
      ? accounts.filter((account) => account.id !== accountId)
      : accountField === "from"
        ? accounts.filter((account) => account.id !== toAccountId)
        : accounts;
  const canSelectOutOfWallet =
    accountField === "to"
      ? accountId !== OUT_OF_WALLET_ACCOUNT_ID
      : accountField === "from" && toAccountId !== OUT_OF_WALLET_ACCOUNT_ID;
  const accountOptions = canSelectOutOfWallet
    ? [...trackedAccountOptions, OUT_OF_WALLET_ACCOUNT]
    : trackedAccountOptions;
  const title =
    accountField === "to"
      ? "To Account"
      : accountField === "from"
        ? "From Account"
        : "Account";

  return (
    <>
      <AccountPickerScreen
        accounts={accountOptions}
        selectedAccountId={selectedAccountId}
        onSelectAccount={(account) => {
          if (accountField === "to") {
            setToAccountId(account.id);
          } else {
            setAccountId(account.id);
          }
          router.back();
        }}
      />
      <Stack.Screen.Title>{title}</Stack.Screen.Title>
    </>
  );
}
