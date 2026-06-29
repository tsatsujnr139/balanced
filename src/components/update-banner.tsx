import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors } from "@/hooks/use-theme";
import { useRemoteUpdate } from "@/lib/updates";

export function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const {
    isUpdateAvailable,
    isUpdatePending,
    isDownloading,
    reloadApp,
    checkForUpdateAsync,
    fetchUpdateAsync,
  } = useRemoteUpdate();

  useEffect(() => {
    if (__DEV__) return;

    checkForUpdateAsync();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkForUpdateAsync();
      }
    });

    return () => subscription.remove();
  }, [checkForUpdateAsync]);

  useEffect(() => {
    if (isUpdateAvailable && !isDownloading) {
      fetchUpdateAsync();
    }
  }, [isUpdateAvailable, isDownloading, fetchUpdateAsync]);

  if (!isUpdatePending) {
    return null;
  }

  return (
    <View
      className="absolute inset-x-4 items-center"
      style={{ bottom: insets.bottom + 16 }}
      pointerEvents="box-none"
    >
      <View
        className="w-full max-w-sm flex-row items-center gap-3 rounded-2xl bg-card px-4 py-3"
        style={{
          borderCurve: "continuous",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
        }}
      >
        <View className="size-10 items-center justify-center rounded-xl bg-primary/10">
          <SymbolView
            name="arrow.down.circle.fill"
            size={22}
            tintColor={colors.primary}
          />
        </View>

        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">
            Update ready
          </Text>
          <Text className="text-xs text-muted">Restart the app to apply.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          className="rounded-xl bg-primary px-4 py-2"
          onPress={reloadApp}
        >
          <Text className="text-sm font-semibold text-white">Restart</Text>
        </Pressable>
      </View>
    </View>
  );
}
