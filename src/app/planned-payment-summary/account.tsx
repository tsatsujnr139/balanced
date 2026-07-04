import { router } from "expo-router";

import { AccountPickerScreen } from "@/features/finance/components/account-picker-screen";
import { usePlannedPaymentSummary } from "@/features/finance/planned-payment-summary-context";
import { useFinance } from "@/features/finance/use-finance";

export default function PlannedPaymentSummaryAccountScreen() {
  const { accounts } = useFinance();
  const { accountId, setAccountId } = usePlannedPaymentSummary();

  return (
    <AccountPickerScreen
      accounts={accounts}
      selectedAccountId={accountId}
      onSelectAccount={(account) => {
        setAccountId(account.id);
        router.back();
      }}
    />
  );
}
