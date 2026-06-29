import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useThemeColors } from "@/hooks/use-theme";
import { useAppLock } from "@/providers/app-lock-provider";

export function AppLockGate({ children }: PropsWithChildren) {
  const colors = useThemeColors();
  const {
    capability,
    errorMessage,
    isAuthenticating,
    isEnabled,
    isHydrating,
    isUnlocked,
    unlock,
  } = useAppLock();

  useEffect(() => {
    if (
      !isHydrating &&
      isEnabled &&
      !isUnlocked &&
      capability?.canAuthenticate
    ) {
      unlock();
    }
  }, [capability?.canAuthenticate, isEnabled, isHydrating, isUnlocked, unlock]);

  if (isHydrating) {
    return null;
  }

  if (!isEnabled || isUnlocked || process.env.EXPO_OS === "web") {
    return children;
  }

  const canAuthenticate = capability?.canAuthenticate ?? false;
  const buttonLabel = canAuthenticate
    ? `Unlock with ${capability?.label}`
    : "Unlock";

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <SymbolView name="lock.fill" size={40} tintColor={colors.primary} />

      <ThemedText className="mt-4 text-center text-[28px] font-bold">
        Balanced Locked
      </ThemedText>

      {errorMessage ? (
        <ThemedText
          className="mt-2 max-w-[320px] text-center"
          color="muted"
          selectable
          type="small"
        >
          {errorMessage}
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        className="mt-6 min-h-12 flex-row items-center justify-center gap-2 rounded-full bg-card px-7"
        disabled={isAuthenticating || !canAuthenticate}
        onPress={() => {
          unlock();
        }}
        style={{ opacity: isAuthenticating || !canAuthenticate ? 0.55 : 1 }}
      >
        {isAuthenticating ? (
          <ActivityIndicator color={colors.foreground} size="small" />
        ) : null}
        <Text
          className="text-base font-medium"
          style={{ color: colors.foreground }}
        >
          {isAuthenticating ? "Unlocking…" : buttonLabel}
        </Text>
      </Pressable>
    </View>
  );
}
