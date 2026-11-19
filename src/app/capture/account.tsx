import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";

import { useCapture } from "@/features/capture/capture-context";
import { AccountPickerScreen } from "@/features/finance/components/account-picker-screen";
import {
  OUT_OF_WALLET_ACCOUNT,
  OUT_OF_WALLET_ACCOUNT_ID,
  isOutOfWalletAccountId,
} from "@/features/finance/out-of-wallet";
import { useFinance } from "@/features/finance/use-finance";

export default function CaptureAccountScreen() {
  const { draft: draftParam, field: fieldParam } = useLocalSearchParams<{
    draft?: string | string[];
    field?: string | string[];
  }>();
  const draftKey = Array.isArray(draftParam) ? draftParam[0] : draftParam;
  const field = Array.isArray(fieldParam) ? fieldParam[0] : fieldParam;
  const isDestination = field === "to";
  const { accounts } = useFinance();
  const { drafts, setDraftAccount, setDraftToAccount } = useCapture();
  const draft = drafts.find((item) => item.key === draftKey);
  const options = isDestination
    ? [
        ...accounts.filter((account) => account.id !== draft?.accountId),
        OUT_OF_WALLET_ACCOUNT,
      ]
    : accounts.filter((account) => account.id !== draft?.toAccountId);
  const selectedAccountId = isDestination
    ? (draft?.toAccountId ?? OUT_OF_WALLET_ACCOUNT_ID)
    : (draft?.accountId ?? null);

  return (
    <>
      <AccountPickerScreen
        accounts={options}
        selectedAccountId={selectedAccountId}
        onSelectAccount={(account) => {
          if (draftKey && isDestination) {
            setDraftToAccount(
              draftKey,
              isOutOfWalletAccountId(account.id) ? null : account.id
            );
          } else if (draftKey) {
            setDraftAccount(draftKey, account.id);
          }
          router.back();
        }}
      />
      <Stack.Screen.Title>
        {isDestination ? "To Account" : "Account"}
      </Stack.Screen.Title>
    </>
  );
}
