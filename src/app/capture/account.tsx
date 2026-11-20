import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";

import { useCapture } from "@/features/capture/capture-context";
import { AccountPickerScreen } from "@/features/finance/components/account-picker-screen";
import {
  OUT_OF_WALLET_ACCOUNT,
  OUT_OF_WALLET_ACCOUNT_ID,
  isOutOfWalletAccountId,
} from "@/features/finance/out-of-wallet";
import type { Account } from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";

const DETECT_ACCOUNT_ID = "__detect__";

/** Leaves each message to pick its own account. */
const DETECT_ACCOUNT: Account = {
  balance: 0,
  color: "#8E8E93",
  currency: "",
  id: DETECT_ACCOUNT_ID,
  institution: "From each message",
  name: "Detect automatically",
  symbol: "sparkles",
  type: "general",
};

export default function CaptureAccountScreen() {
  const { draft: draftParam, field: fieldParam } = useLocalSearchParams<{
    draft?: string | string[];
    field?: string | string[];
  }>();
  const draftKey = Array.isArray(draftParam) ? draftParam[0] : draftParam;
  const field = Array.isArray(fieldParam) ? fieldParam[0] : fieldParam;
  const isDestination = field === "to";
  const isCaptureSource = field === "capture";
  const { accounts } = useFinance();
  const {
    drafts,
    setDraftAccount,
    setDraftToAccount,
    setSourceAccountId,
    sourceAccountId,
  } = useCapture();
  const draft = drafts.find((item) => item.key === draftKey);
  if (isCaptureSource) {
    return (
      <>
        <AccountPickerScreen
          accounts={[DETECT_ACCOUNT, ...accounts]}
          selectedAccountId={sourceAccountId ?? DETECT_ACCOUNT_ID}
          onSelectAccount={(account) => {
            setSourceAccountId(
              account.id === DETECT_ACCOUNT_ID ? null : account.id
            );
            router.back();
          }}
        />
        <Stack.Screen.Title>Account</Stack.Screen.Title>
      </>
    );
  }
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
