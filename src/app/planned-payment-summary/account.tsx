import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";

import { AccountPickerScreen } from "@/features/finance/components/account-picker-screen";
import { usePlannedPaymentSummary } from "@/features/finance/planned-payment-summary-context";
import { useFinance } from "@/features/finance/use-finance";

export default function PlannedPaymentSummaryAccountScreen() {
  const { field } = useLocalSearchParams<{ field?: string | string[] }>();
  const accountField = Array.isArray(field) ? field[0] : field;
  const { accounts } = useFinance();
  const { accountId, setAccountId, setToAccountId, toAccountId } =
    usePlannedPaymentSummary();
  const selectedAccountId = accountField === "to" ? toAccountId : accountId;
  const accountOptions =
    accountField === "to"
      ? accounts.filter((account) => account.id !== accountId)
      : accounts;
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
            if (toAccountId === account.id) {
              setToAccountId(null);
            }
          }
          router.back();
        }}
      />
      <Stack.Screen.Title>{title}</Stack.Screen.Title>
    </>
  );
}
