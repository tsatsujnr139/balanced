import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Uniwind } from "uniwind";

import "@/global.css";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AppLockGate } from "@/components/app-lock-gate";
import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { UpdateBanner } from "@/components/update-banner";
import { useThemeColors } from "@/hooks/use-theme";
import { applyStartupUpdate } from "@/lib/updates";
import { AppLockProvider } from "@/providers/app-lock-provider";
import { ConvexClientProvider } from "@/providers/convex-provider";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors();
  const androidHeaderStyle =
    process.env.EXPO_OS === "android"
      ? { backgroundColor: colors.background }
      : undefined;

  useEffect(() => {
    Uniwind.setTheme("system");
    applyStartupUpdate();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexClientProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <AppLockProvider>
            <StatusBar style="auto" />
            <AnimatedSplashOverlay />
            <AppLockGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="account/[id]"
                  options={{
                    headerBackButtonDisplayMode: "minimal",
                    headerBlurEffect:
                      process.env.EXPO_OS === "ios"
                        ? shouldDisableHeaderBlur()
                          ? "none"
                          : "systemMaterial"
                        : undefined,
                    headerShadowVisible: false,
                    headerShown: true,
                    headerStyle: androidHeaderStyle,
                    headerTransparent: process.env.EXPO_OS === "ios",
                  }}
                />
                <Stack.Screen
                  name="transactions"
                  options={{
                    animation: "fade",
                    animationDuration: 150,
                    headerStyle: androidHeaderStyle,
                    headerTransparent: process.env.EXPO_OS === "ios",
                  }}
                />
                <Stack.Screen
                  name="budgets"
                  options={{
                    animation: "fade",
                    animationDuration: 150,
                    headerStyle: androidHeaderStyle,
                    headerTransparent: process.env.EXPO_OS === "ios",
                  }}
                />
                <Stack.Screen
                  name="templates"
                  options={{
                    animation: "fade",
                    animationDuration: 150,
                    headerStyle: androidHeaderStyle,
                    headerTransparent: process.env.EXPO_OS === "ios",
                  }}
                />
                <Stack.Screen
                  name="tags"
                  options={{
                    animation: "fade",
                    animationDuration: 150,
                    headerStyle: androidHeaderStyle,
                    headerTransparent: process.env.EXPO_OS === "ios",
                  }}
                />
                <Stack.Screen
                  name="categories"
                  options={{
                    animation: "fade",
                    animationDuration: 150,
                    headerStyle: androidHeaderStyle,
                    headerTransparent: process.env.EXPO_OS === "ios",
                  }}
                />
                <Stack.Screen
                  name="budget/[id]"
                  options={{
                    headerBackButtonDisplayMode: "minimal",
                    headerBlurEffect:
                      process.env.EXPO_OS === "ios"
                        ? shouldDisableHeaderBlur()
                          ? "none"
                          : "systemMaterial"
                        : undefined,
                    headerShadowVisible: false,
                    headerShown: true,
                    headerStyle: androidHeaderStyle,
                    headerTransparent: process.env.EXPO_OS === "ios",
                  }}
                />
                <Stack.Screen
                  name="notifications"
                  options={{
                    headerBackButtonDisplayMode: "minimal",
                    headerBlurEffect:
                      process.env.EXPO_OS === "ios"
                        ? shouldDisableHeaderBlur()
                          ? "none"
                          : "systemMaterial"
                        : undefined,
                    headerShadowVisible: false,
                    headerShown: true,
                    headerStyle: androidHeaderStyle,
                    headerTransparent: process.env.EXPO_OS === "ios",
                  }}
                />
                <Stack.Screen
                  name="add-transaction"
                  options={{
                    contentStyle: { backgroundColor: "transparent" },
                    presentation: "formSheet",
                    sheetAllowedDetents: [1],
                    sheetGrabberVisible: false,
                    sheetInitialDetentIndex: 0,
                    sheetShouldOverflowTopInset: true,
                  }}
                />
                <Stack.Screen
                  name="add-account"
                  options={{
                    contentStyle: { backgroundColor: "transparent" },
                    presentation: "formSheet",
                    sheetAllowedDetents: [1],
                    sheetGrabberVisible: false,
                    sheetInitialDetentIndex: 0,
                    sheetShouldOverflowTopInset: true,
                  }}
                />
                <Stack.Screen
                  name="add-budget"
                  options={{
                    contentStyle: { backgroundColor: "transparent" },
                    presentation: "formSheet",
                    sheetAllowedDetents: [1],
                    sheetGrabberVisible: false,
                    sheetInitialDetentIndex: 0,
                    sheetShouldOverflowTopInset: true,
                  }}
                />
                <Stack.Screen
                  name="add-template"
                  options={{
                    contentStyle: { backgroundColor: "transparent" },
                    presentation: "formSheet",
                    sheetAllowedDetents: [1],
                    sheetGrabberVisible: false,
                    sheetInitialDetentIndex: 0,
                    sheetShouldOverflowTopInset: true,
                  }}
                />
                <Stack.Screen
                  name="planned-payments"
                  options={{
                    animation: "fade",
                    animationDuration: 150,
                    headerStyle: androidHeaderStyle,
                    headerTransparent: process.env.EXPO_OS === "ios",
                  }}
                />
                <Stack.Screen
                  name="planned-payment/[id]"
                  options={{
                    headerBackButtonDisplayMode: "minimal",
                    headerBlurEffect:
                      process.env.EXPO_OS === "ios"
                        ? shouldDisableHeaderBlur()
                          ? "none"
                          : "systemMaterial"
                        : undefined,
                    headerShadowVisible: false,
                    headerShown: true,
                    headerStyle: androidHeaderStyle,
                    headerTransparent: process.env.EXPO_OS === "ios",
                  }}
                />
                <Stack.Screen
                  name="planned-payment-summary"
                  options={{
                    contentStyle: { backgroundColor: "transparent" },
                    presentation: "formSheet",
                    sheetAllowedDetents: [1],
                    sheetGrabberVisible: false,
                    sheetInitialDetentIndex: 0,
                    sheetShouldOverflowTopInset: true,
                  }}
                />
                <Stack.Screen
                  name="add-planned-payment"
                  options={{
                    contentStyle: { backgroundColor: "transparent" },
                    presentation: "formSheet",
                    sheetAllowedDetents: [1],
                    sheetGrabberVisible: false,
                    sheetInitialDetentIndex: 0,
                    sheetShouldOverflowTopInset: true,
                  }}
                />
                <Stack.Screen
                  name="add-tag"
                  options={{
                    contentStyle: { backgroundColor: "transparent" },
                    presentation: "formSheet",
                    sheetAllowedDetents: [1],
                    sheetGrabberVisible: false,
                    sheetInitialDetentIndex: 0,
                    sheetShouldOverflowTopInset: true,
                  }}
                />
                <Stack.Screen
                  name="add-category"
                  options={{
                    contentStyle: { backgroundColor: "transparent" },
                    presentation: "formSheet",
                    sheetAllowedDetents: [1],
                    sheetGrabberVisible: false,
                    sheetInitialDetentIndex: 0,
                    sheetShouldOverflowTopInset: true,
                  }}
                />
              </Stack>
            </AppLockGate>
            <UpdateBanner />
          </AppLockProvider>
        </ThemeProvider>
      </ConvexClientProvider>
    </GestureHandlerRootView>
  );
}
