import { useQuery } from "convex/react";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";

import { useAddTransaction } from "@/features/finance/add-transaction-context";
import { TransactionTemplateList } from "@/features/finance/components/transaction-template-list";
import type { TransactionTemplate } from "@/features/finance/types";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../../convex/_generated/api";

function filterTemplates(
  templates: TransactionTemplate[],
  query: string
): TransactionTemplate[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return templates;
  }
  return templates.filter(
    (template) =>
      template.name.toLowerCase().includes(normalized) ||
      template.category.toLowerCase().includes(normalized) ||
      template.accountName.toLowerCase().includes(normalized) ||
      template.merchant.toLowerCase().includes(normalized) ||
      template.tags.some((tag) => tag.name.toLowerCase().includes(normalized))
  );
}

export default function AddTransactionTemplatesScreen() {
  const colors = useThemeColors();
  const templates = useQuery(api.finance.listTransactionTemplates);
  const { applyTemplate } = useAddTransaction();
  const [query, setQuery] = useState("");
  const filteredTemplates = useMemo(
    () => filterTemplates(templates ?? [], query),
    [query, templates]
  );

  return (
    <>
      <Stack.SearchBar
        autoCapitalize="none"
        onCancelButtonPress={() => setQuery("")}
        onChangeText={(event) => {
          setQuery(event.nativeEvent.text);
        }}
        placeholder="Search templates"
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
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
        {templates === undefined ? (
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
          <TransactionTemplateList
            emptyText="No templates found"
            templates={filteredTemplates}
            onPressTemplate={(template) => {
              applyTemplate(template);
              router.back();
            }}
          />
        )}
      </ScrollView>
    </>
  );
}
