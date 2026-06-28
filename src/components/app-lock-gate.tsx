import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

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

  const statusMessage =
    errorMessage ??
    (capability?.canAuthenticate
      ? `Use ${capability.label} or your device passcode to continue.`
      : "Device authentication is not available. Check your system settings and try again.");

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="items-center gap-5">
        <View
          className="items-center justify-center bg-card"
          style={{
            borderCurve: "continuous",
            borderRadius: 28,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.10)",
            height: 86,
            width: 86,
          }}
        >
          <SymbolView
            name="lock.shield.fill"
            size={42}
            tintColor={colors.primary}
          />
        </View>

        <View className="items-center gap-2">
          <ThemedText className="text-center" type="subtitle">
            Balanced is locked
          </ThemedText>
          <ThemedText
            className="max-w-[320px] text-center"
            color="muted"
            selectable
            type="small"
          >
            {statusMessage}
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          className="min-h-14 w-full max-w-[320px] flex-row items-center justify-center gap-2 rounded-2xl bg-primary px-5"
          disabled={isAuthenticating || !capability?.canAuthenticate}
          onPress={() => {
            unlock();
          }}
          style={{
            opacity:
              isAuthenticating || !capability?.canAuthenticate ? 0.55 : 1,
          }}
        >
          {isAuthenticating ? <ActivityIndicator color="#FFFFFF" /> : null}
          <Text className="text-base font-semibold text-white">
            {isAuthenticating ? "Unlocking..." : "Unlock Balanced"}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
