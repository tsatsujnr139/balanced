import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import type { AppNotification } from "@/features/finance/notifications";
import { useAppNotifications } from "@/features/finance/use-app-notifications";
import { useThemeColors } from "@/hooks/use-theme";

function NotificationRow({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push({
          params: { id: notification.routeId },
          pathname: notification.route,
        });
      }}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="size-10 items-center justify-center rounded-full"
          style={{ backgroundColor: notification.color }}
        >
          <SymbolView
            name={notification.symbol as never}
            size={18}
            tintColor="#fff"
          />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <ThemedText type="smallBold" className="text-base leading-[22px]">
            {notification.title}
          </ThemedText>
          <ThemedText
            type="small"
            color="muted"
            className="text-[15px] leading-[21px]"
          >
            {notification.body}
          </ThemedText>
        </View>
        <Pressable
          accessibilityLabel="Clear notification"
          accessibilityRole="button"
          hitSlop={10}
          onPress={(event) => {
            event.stopPropagation();
            onDismiss();
          }}
        >
          <View
            className="size-8 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.border }}
          >
            <SymbolView name="xmark" size={12} tintColor={colors.muted} />
          </View>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const colors = useThemeColors();
  const { clearNotifications, dismissNotification, notifications } =
    useAppNotifications();

  return (
    <>
      <Stack.Screen.BackButton displayMode="minimal" />
      <Stack.Screen.Title large>Notifications</Stack.Screen.Title>
      {notifications.length > 0 ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Clear all notifications"
            onPress={clearNotifications}
            variant="plain"
          >
            Clear
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          gap: 18,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        {notifications.length === 0 ? (
          <ThemedView
            variant="card"
            className="items-center rounded-[22px] px-4 py-7"
          >
            <View className="mb-3 size-11 items-center justify-center rounded-full bg-background">
              <SymbolView name="bell" size={22} tintColor={colors.muted} />
            </View>
            <ThemedText type="small" color="muted" className="text-center">
              No notifications
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView variant="card" className="rounded-[22px] p-4">
            {notifications.map((notification, index) => (
              <View key={notification.id}>
                <NotificationRow
                  notification={notification}
                  onDismiss={() => dismissNotification(notification.id)}
                />
                {index < notifications.length - 1 ? (
                  <View
                    className="my-4 h-px"
                    style={{ backgroundColor: colors.border }}
                  />
                ) : null}
              </View>
            ))}
          </ThemedView>
        )}
      </ScrollView>
    </>
  );
}
