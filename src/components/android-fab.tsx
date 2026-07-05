import { router } from "expo-router";

import { ScreenFab } from "@/components/screen-fab";
import { BottomTabInset } from "@/constants/theme";

/**
 * Android-only floating "+" over the tab bar — replaces the disabled "+" tab
 * item, which NativeTabs hides on Android since there's no native FAB
 * primitive there.
 */
export function AndroidFab() {
  return (
    <ScreenFab
      accessibilityLabel="Add transaction"
      bottomOffset={BottomTabInset}
      onPress={() => {
        router.push("/add-transaction");
      }}
    />
  );
}
