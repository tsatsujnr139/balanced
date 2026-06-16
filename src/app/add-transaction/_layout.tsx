import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Platform } from 'react-native';

import { shouldDisableHeaderBlur } from '@/components/tab-stack-layout';
import { useThemeColors } from '@/hooks/use-theme';

export default function AddTransactionLayout() {
  const colors = useThemeColors();
  const disableHeaderBlur = shouldDisableHeaderBlur();

  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBlurEffect:
          Platform.OS === 'ios' ? (disableHeaderBlur ? 'none' : 'systemMaterial') : undefined,
        headerShadowVisible: false,
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerLargeTitle: false,
          title: 'Add transaction',
        }}>
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            accessibilityLabel="Close"
            icon="xmark"
            onPress={() => {
              router.back();
            }}
            separateBackground
          />
        </Stack.Toolbar>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Save transaction"
            icon="checkmark"
            onPress={() => {
              router.back();
            }}
            tintColor={colors.primary}
            variant="prominent"
          />
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  );
}
