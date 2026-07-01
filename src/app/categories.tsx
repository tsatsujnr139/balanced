import { useMutation } from "convex/react";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useMemo, useState } from "react";
import { Alert, ScrollView } from "react-native";

import { api } from "@/convex/_generated/api";
import { LabelManagementList } from "@/features/finance/components/label-management-list";
import type { ManagedLabelItem } from "@/features/finance/components/label-management-list";
import { TRANSACTION_CATEGORIES } from "@/features/finance/transaction-categories";
import {
  useArchivedCategoryNames,
  useCachedCategories,
} from "@/features/finance/use-labels";
import { useThemeColors } from "@/hooks/use-theme";

export default function CategoriesScreen() {
  const colors = useThemeColors();
  const { categories: sharedCategories, isLoading } = useCachedCategories();
  const { archivedNames } = useArchivedCategoryNames();
  const deleteCategoryByName = useMutation(api.finance.deleteCategoryByName);
  const [search, setSearch] = useState("");
  const items = useMemo<ManagedLabelItem[]>(() => {
    const query = search.trim().toLowerCase();
    const archived = new Set(archivedNames.map((name) => name.toLowerCase()));
    const allCategories = [
      ...sharedCategories.map((category) => ({
        color: category.color,
        deletable: true,
        id: category.id,
        kind: "category" as const,
        name: category.name,
        symbol: category.symbol,
      })),
      ...TRANSACTION_CATEGORIES.map((category) => ({
        color: category.color,
        deletable: true,
        id: `built-in:${category.name}`,
        kind: "category" as const,
        name: category.name,
        symbol: category.symbol,
      })),
    ]
      .filter((category) => !archived.has(category.name.toLowerCase()))
      .filter(
        (category, index, categories) =>
          categories.findIndex(
            (item) => item.name.toLowerCase() === category.name.toLowerCase()
          ) === index
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!query) {
      return allCategories;
    }

    return allCategories.filter((category) =>
      category.name.toLowerCase().includes(query)
    );
  }, [archivedNames, search, sharedCategories]);

  const confirmDelete = (item: ManagedLabelItem) => {
    Alert.alert(
      "Delete category?",
      `"${item.name}" will be permanently deleted.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            try {
              await deleteCategoryByName({ name: item.name });
            } catch (error) {
              Alert.alert(
                "Could not delete category",
                error instanceof Error ? error.message : "Please try again."
              );
            }
          },
          style: "destructive",
          text: "Delete",
        },
      ]
    );
  };

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          gap: 18,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        keyboardDismissMode="interactive"
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <LabelManagementList
          emptyText="No categories found"
          isLoading={isLoading && items.length === 0}
          items={items}
          onDelete={confirmDelete}
        />
      </ScrollView>

      <Stack.Screen.BackButton displayMode="minimal" />
      <Stack.Screen.Title large>Categories</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Add category"
          icon="plus"
          onPress={() => {
            router.push("/add-category" as never);
          }}
        />
      </Stack.Toolbar>
      <Stack.SearchBar
        autoCapitalize="none"
        onCancelButtonPress={() => setSearch("")}
        onChangeText={(event) => {
          setSearch(event.nativeEvent.text);
        }}
        placeholder="Search categories"
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
    </>
  );
}
