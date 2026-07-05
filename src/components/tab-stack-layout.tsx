import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback } from "react";
import { Platform, View } from "react-native";

import { HeaderIconButton } from "@/components/header-icon-button";
import { MaterialIcons } from "@/constants/material-icons";
import { useAppNotifications } from "@/features/finance/use-app-notifications";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

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
  const colors = useThemeColors();
  const { notificationCount } = useAppNotifications();
  const notificationBadge =
    notificationCount > 0
      ? notificationCount > 99
        ? "99+"
        : String(notificationCount)
      : undefined;

  const renderHeaderRight = useCallback(
    () => (
      <View
        style={{
          alignItems: "center",
          alignSelf: "center",
          flexDirection: "row",
        }}
      >
        {dashboardActions ? (
          <HeaderIconButton
            accessibilityLabel="Notifications"
            badge={notificationBadge}
            icon={MaterialIcons.notifications}
            onPress={() => {
              router.push("/notifications");
            }}
          />
        ) : null}
        <HeaderIconButton
          accessibilityLabel="Search transactions"
          icon={MaterialIcons.search}
          onPress={() => {
            router.push({
              params: { focusSearch: "1" },
              pathname: "/transactions",
            });
          }}
          style={dashboardActions ? { marginRight: -8 } : undefined}
        />
      </View>
    ),
    [dashboardActions, notificationBadge]
  );

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
        headerStyle:
          Platform.OS === "android"
            ? { backgroundColor: colors.background }
            : undefined,
        headerTransparent: Platform.OS === "ios",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerLargeTitle: largeTitle,
          ...androidHeaderOptions({ headerRight: renderHeaderRight }),
          headerShown,
          title,
        }}
      >
        <Stack.Header
          transparent={Platform.OS === "ios"}
          style={{
            backgroundColor:
              Platform.OS === "android" ? colors.background : undefined,
            shadowColor: "transparent",
          }}
          largeStyle={{ shadowColor: "transparent" }}
        />
        {Platform.OS === "ios" ? (
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
        ) : null}
      </Stack.Screen>
    </Stack>
  );
}
