import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Uniwind } from 'uniwind';

import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AppLockGate } from '@/components/app-lock-gate';
import { shouldDisableHeaderBlur } from '@/components/tab-stack-layout';
import { AppLockProvider } from '@/providers/app-lock-provider';
import { ConvexClientProvider } from '@/providers/convex-provider';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    Uniwind.setTheme('system');
  }, []);

  return (
    <ConvexClientProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppLockProvider>
          <AnimatedSplashOverlay />
          <AppLockGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="account/[id]"
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBlurEffect:
                    process.env.EXPO_OS === 'ios'
                      ? shouldDisableHeaderBlur()
                        ? 'none'
                        : 'systemMaterial'
                      : undefined,
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="transactions"
                options={{
                  animation: 'fade',
                  animationDuration: 150,
                }}
              />
              <Stack.Screen
                name="budgets"
                options={{
                  animation: 'fade',
                  animationDuration: 150,
                }}
              />
              <Stack.Screen
                name="templates"
                options={{
                  animation: 'fade',
                  animationDuration: 150,
                }}
              />
          <Stack.Screen
            name="budget/[id]"
            options={{
              headerShown: true,
                  headerTransparent: true,
                  headerBlurEffect:
                    process.env.EXPO_OS === 'ios'
                      ? shouldDisableHeaderBlur()
                        ? 'none'
                        : 'systemMaterial'
                      : undefined,
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="notifications"
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBlurEffect:
                    process.env.EXPO_OS === 'ios'
                      ? shouldDisableHeaderBlur()
                        ? 'none'
                        : 'systemMaterial'
                      : undefined,
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="add-transaction"
                options={{
                  contentStyle: { backgroundColor: 'transparent' },
                  presentation: 'formSheet',
                  sheetAllowedDetents: [1],
                  sheetInitialDetentIndex: 0,
                  sheetGrabberVisible: false,
                }}
              />
              <Stack.Screen
                name="add-account"
                options={{
                  contentStyle: { backgroundColor: 'transparent' },
                  presentation: 'formSheet',
                  sheetAllowedDetents: [1],
                  sheetInitialDetentIndex: 0,
                  sheetGrabberVisible: false,
                }}
              />
              <Stack.Screen
                name="add-budget"
                options={{
                  contentStyle: { backgroundColor: 'transparent' },
                  presentation: 'formSheet',
                  sheetAllowedDetents: [1],
                  sheetInitialDetentIndex: 0,
                  sheetGrabberVisible: false,
                }}
              />
          <Stack.Screen
            name="add-template"
            options={{
              contentStyle: { backgroundColor: 'transparent' },
              presentation: 'formSheet',
              sheetAllowedDetents: [1],
              sheetInitialDetentIndex: 0,
                  sheetGrabberVisible: false,
                }}
              />
              <Stack.Screen
                name="planned-payments"
                options={{
                  animation: 'fade',
                  animationDuration: 150,
                }}
              />
              <Stack.Screen
                name="planned-payment/[id]"
                options={{
                  headerShown: true,
                  headerTransparent: true,
                  headerBlurEffect:
                    process.env.EXPO_OS === 'ios'
                      ? shouldDisableHeaderBlur()
                        ? 'none'
                        : 'systemMaterial'
                      : undefined,
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="add-planned-payment"
                options={{
                  contentStyle: { backgroundColor: 'transparent' },
                  presentation: 'formSheet',
                  sheetAllowedDetents: [1],
                  sheetInitialDetentIndex: 0,
                  sheetGrabberVisible: false,
                }}
              />
            </Stack>
          </AppLockGate>
        </AppLockProvider>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
