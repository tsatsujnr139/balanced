import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Platform } from 'react-native';

type Props = {
  title: string;
  largeTitle?: boolean;
  headerShown?: boolean;
};

function getIOSVersion() {
  if (Platform.OS !== 'ios') {
    return 0;
  }

  return typeof Platform.Version === 'string'
    ? Number.parseFloat(Platform.Version)
    : Platform.Version;
}

// iOS 26 UIKit bug: large titles disappear when combined with header blur.
// Also avoids RNScreens warning when NativeTabs scroll edge effects are active.
export function shouldDisableHeaderBlur() {
  return getIOSVersion() >= 26;
}

// iOS 26 UIKit bug: large titles disappear when combined with header blur.
const disableHeaderBlur = shouldDisableHeaderBlur();

export function TabStackLayout({ title, largeTitle = false, headerShown = true }: Props) {
  return (
    <Stack
      screenOptions={{
        headerShown,
        headerTransparent: true,
        headerBlurEffect:
          Platform.OS === 'ios' ? (disableHeaderBlur ? 'none' : 'systemMaterial') : undefined,
        headerShadowVisible: false,
        headerLargeTitle: largeTitle,
      }}>
      <Stack.Screen name="index" options={{ title, headerShown, headerLargeTitle: largeTitle }}>
        <Stack.Header
          transparent
          style={{ shadowColor: 'transparent' }}
          largeStyle={{ shadowColor: 'transparent' }}
        />
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Search transactions"
            icon="magnifyingglass"
            onPress={() => {
              router.push('/search-transactions');
            }}
            separateBackground
          />
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  );
}
