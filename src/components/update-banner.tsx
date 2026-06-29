import * as SecureStore from "expo-secure-store";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeColors } from "@/hooks/use-theme";
import { useRemoteUpdate } from "@/lib/updates";

const RESTART_KEY = "update:restarting-for";

export function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const {
    isUpdateAvailable,
    isUpdatePending,
    isDownloading,
    downloadedUpdate,
    reloadApp,
    checkForUpdateAsync,
    fetchUpdateAsync,
  } = useRemoteUpdate();

  // Tracks whether we've already triggered a restart for the pending update.
  // reloadAsync() reloads the JS runtime but the native pending-update flag
  // isn't cleared until a full cold start, so without this the banner would
  // reappear on the reloaded bundle.
  const [suppressed, setSuppressed] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(RESTART_KEY).then((storedId) => {
      if (storedId && storedId === downloadedUpdate?.updateId) {
        setSuppressed(true);
        SecureStore.deleteItemAsync(RESTART_KEY);
      } else {
        setSuppressed(false);
      }
    });
  }, [downloadedUpdate?.updateId]);

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

  const handleRestart = async () => {
    if (downloadedUpdate?.updateId) {
      await SecureStore.setItemAsync(RESTART_KEY, downloadedUpdate.updateId);
    }
    await reloadApp();
  };

  if (!isUpdatePending || suppressed !== false) {
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
          onPress={handleRestart}
        >
          <Text className="text-sm font-semibold text-white">Restart</Text>
        </Pressable>
      </View>
    </View>
  );
}
