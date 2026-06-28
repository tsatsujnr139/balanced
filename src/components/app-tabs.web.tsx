import type { TabTriggerSlotProps, TabListProps } from "expo-router/ui";
import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { Pressable, View } from "react-native";

import { MaxContentWidth } from "@/constants/theme";

import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: "100%" }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="dashboard" href="/dashboard" asChild>
            <TabButton>Dashboard</TabButton>
          </TabTrigger>
          <TabTrigger name="planning" href="/planning" asChild>
            <TabButton>Planning</TabButton>
          </TabTrigger>
          <TabTrigger name="stats" href="/stats" asChild>
            <TabButton>Stats</TabButton>
          </TabTrigger>
          <TabTrigger name="you" href="/you" asChild>
            <TabButton>You</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
  return (
    <Pressable {...props} className="active:opacity-70">
      <ThemedView
        variant={isFocused ? "selected" : "card"}
        className="rounded-xl px-4 py-1"
      >
        <ThemedText type="small" color={isFocused ? "foreground" : "muted"}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View
      {...props}
      className="absolute w-full flex-row items-center justify-center p-4"
    >
      <ThemedView
        variant="card"
        className="max-w-full grow flex-row items-center gap-2 rounded-4xl px-8 py-2"
        style={{ maxWidth: MaxContentWidth }}
      >
        <ThemedText type="smallBold" className="mr-auto">
          balanced
        </ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}
