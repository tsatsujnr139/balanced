import { router, useLocalSearchParams } from "expo-router";

import { useCapture } from "@/features/capture/capture-context";
import { AccountPickerScreen } from "@/features/finance/components/account-picker-screen";
import { useFinance } from "@/features/finance/use-finance";

export default function CaptureAccountScreen() {
  const { draft: draftParam } = useLocalSearchParams<{
    draft?: string | string[];
  }>();
  const draftKey = Array.isArray(draftParam) ? draftParam[0] : draftParam;
  const { accounts } = useFinance();
  const { drafts, setDraftAccount } = useCapture();
  const draft = drafts.find((item) => item.key === draftKey);

  return (
    <AccountPickerScreen
      accounts={accounts}
      selectedAccountId={draft?.accountId ?? null}
      onSelectAccount={(account) => {
        if (draftKey) {
          setDraftAccount(draftKey, account.id);
        }
        router.back();
      }}
    />
  );
}
