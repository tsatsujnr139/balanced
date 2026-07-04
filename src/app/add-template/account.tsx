import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";

import { useAddTemplate } from "@/features/finance/add-template-context";
import { AccountPickerScreen } from "@/features/finance/components/account-picker-screen";
import { useFinance } from "@/features/finance/use-finance";

export default function TemplateAccountScreen() {
  const { field } = useLocalSearchParams<{ field?: string | string[] }>();
  const accountField = Array.isArray(field) ? field[0] : field;
  const { accounts } = useFinance();
  const { accountId, setAccountId, setToAccountId, toAccountId } =
    useAddTemplate();
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
