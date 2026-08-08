import { useQuery } from "convex/react";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useMemo, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, View } from "react-native";

import { ScreenFab } from "@/components/screen-fab";
import { api } from "@/convex/_generated/api";
import { AutomaticRuleList } from "@/features/finance/components/automatic-rule-list";
import type { AutomaticRule } from "@/features/finance/types";
import { useThemeColors } from "@/hooks/use-theme";

const filterRules = (
  rules: AutomaticRule[],
  query: string
): AutomaticRule[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return rules;
  }
  return rules.filter(
    (rule) =>
      rule.name.toLocaleLowerCase().includes(normalizedQuery) ||
      rule.matchText.toLocaleLowerCase().includes(normalizedQuery) ||
      rule.category?.name.toLocaleLowerCase().includes(normalizedQuery) ||
      rule.tags.some((tag) =>
        tag.name.toLocaleLowerCase().includes(normalizedQuery)
      )
  );
};

export default function AutomaticRulesScreen() {
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const rules = useQuery(api.automaticRules.list);
  const filteredRules = useMemo(
    () => filterRules((rules ?? []) as AutomaticRule[], query),
    [query, rules]
  );

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          gap: 18,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        keyboardDismissMode="interactive"
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        {rules === undefined ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              minHeight: 160,
            }}
          >
            <ActivityIndicator />
          </View>
        ) : (
          <AutomaticRuleList
            emptyText={query ? "No rules found" : "No automatic rules yet"}
            rules={filteredRules}
            onPressRule={(rule) => {
              router.push({
                params: { id: rule.id },
                pathname: "/add-automatic-rule",
              });
            }}
          />
        )}
      </ScrollView>

      <Stack.Screen.BackButton displayMode="minimal" />
      <Stack.Screen.Title large>Automatic Rules</Stack.Screen.Title>
      {Platform.OS === "ios" ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Add automatic rule"
            icon="plus"
            onPress={() => router.push("/add-automatic-rule" as never)}
          />
        </Stack.Toolbar>
      ) : (
        <ScreenFab
          accessibilityLabel="Add automatic rule"
          onPress={() => router.push("/add-automatic-rule" as never)}
        />
      )}
      <Stack.SearchBar
        autoCapitalize="none"
        hideNavigationBar={false}
        onCancelButtonPress={() => setQuery("")}
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        placeholder="Search rules"
      />
      {Platform.OS === "ios" ? (
        <Stack.Toolbar placement="bottom">
          <Stack.Toolbar.SearchBarSlot />
        </Stack.Toolbar>
      ) : null}
    </>
  );
}
