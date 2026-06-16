import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Uniwind } from 'uniwind';

import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ConvexClientProvider } from '@/providers/convex-provider';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    Uniwind.setTheme('system');
  }, []);

  return (
    <ConvexClientProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="search-transactions"
            options={{
              animation: 'fade',
              animationDuration: 150,
              gestureEnabled: false,
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
        </Stack>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
