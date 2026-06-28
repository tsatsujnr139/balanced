import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { Platform } from "react-native";

import { useAppNotifications } from "@/features/finance/use-app-notifications";

interface Props {
  title: string;
  largeTitle?: boolean;
  headerShown?: boolean;
  dashboardActions?: boolean;
}

function getIOSVersion() {
  if (Platform.OS !== "ios") {
    return 0;
  }

  return typeof Platform.Version === "string"
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

export function TabStackLayout({
  title,
  largeTitle = false,
  headerShown = true,
  dashboardActions = false,
}: Props) {
  const { notificationCount } = useAppNotifications();
  const notificationBadge =
    notificationCount > 0
      ? notificationCount > 99
        ? "99+"
        : String(notificationCount)
      : undefined;

  return (
    <Stack
      screenOptions={{
        headerBlurEffect:
          Platform.OS === "ios"
            ? disableHeaderBlur
              ? "none"
              : "systemMaterial"
            : undefined,
        headerLargeTitle: largeTitle,
        headerShadowVisible: false,
        headerShown,
        headerTransparent: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerLargeTitle: largeTitle, headerShown, title }}
      >
        <Stack.Header
          transparent
          style={{ shadowColor: "transparent" }}
          largeStyle={{ shadowColor: "transparent" }}
        />
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Notifications"
            hidden={!dashboardActions}
            onPress={() => {
              router.push("/notifications");
            }}
            separateBackground
          >
            <Stack.Toolbar.Icon sf="bell" />
            {notificationBadge ? (
              <Stack.Toolbar.Badge>{notificationBadge}</Stack.Toolbar.Badge>
            ) : null}
          </Stack.Toolbar.Button>
          <Stack.Toolbar.Button
            accessibilityLabel="Search transactions"
            icon="magnifyingglass"
            onPress={() => {
              router.push({
                params: { focusSearch: "1" },
                pathname: "/transactions",
              });
            }}
            separateBackground
          />
        </Stack.Toolbar>
      </Stack.Screen>
    </Stack>
  );
}
