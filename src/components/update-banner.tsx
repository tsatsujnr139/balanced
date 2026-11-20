import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon as SymbolView } from "@/components/icon";
import { useThemeColors } from "@/hooks/use-theme";
import { useRemoteUpdate } from "@/lib/updates";

export function UpdateBanner() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { canRestart, isDownloading, isRestarting, reloadApp } =
    useRemoteUpdate();
  const [isApplying, setIsApplying] = useState(false);
  const restartInFlight = useRef(false);

  const handleRestart = async () => {
    if (restartInFlight.current || isRestarting || isDownloading) {
      return;
    }
    restartInFlight.current = true;
    setIsApplying(true);
    try {
      await reloadApp();
      // On success the runtime is being replaced. Keep the button disabled until then.
    } catch {
      restartInFlight.current = false;
      setIsApplying(false);
      Alert.alert(
        "Could not restart",
        "The update is still ready. Please try again."
      );
    }
  };

  if (!canRestart) {
    return null;
  }
  const busy = isApplying || isRestarting || isDownloading;

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
          accessibilityLabel={
            busy ? "Restarting app" : "Restart to apply update"
          }
          accessibilityState={{ busy, disabled: busy }}
          disabled={busy}
          className="rounded-xl bg-primary px-4 py-2"
          onPress={handleRestart}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-white">Restart</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
