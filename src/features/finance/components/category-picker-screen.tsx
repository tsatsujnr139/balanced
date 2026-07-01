import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

import { ThemedView } from "@/components/themed-view";
import { TRANSACTION_CATEGORIES } from "@/features/finance/transaction-categories";
import type { TransactionCategory } from "@/features/finance/transaction-categories";
import {
  useArchivedCategoryNames,
  useCachedCategories,
} from "@/features/finance/use-labels";
import { useThemeColors } from "@/hooks/use-theme";

import { CategoryLeading } from "./label-form-leads";

interface Props {
  customCategories?: readonly TransactionCategory[];
  newCategoryPathname: string;
  onSelectCategory: (category: TransactionCategory) => void;
  selectedCategoryName: string | null;
}

const EMPTY_CUSTOM_CATEGORIES: readonly TransactionCategory[] = [];

export function CategoryPickerScreen({
  customCategories = EMPTY_CUSTOM_CATEGORIES,
  newCategoryPathname,
  onSelectCategory,
  selectedCategoryName,
}: Props) {
  const colors = useThemeColors();
  const { categories: sharedCategories, isLoading } = useCachedCategories();
  const { archivedNames } = useArchivedCategoryNames();
  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim();
  const categories = useMemo(() => {
    const query = trimmedSearch.toLowerCase();
    const archived = new Set(archivedNames.map((name) => name.toLowerCase()));
    const allCategories = [
      ...TRANSACTION_CATEGORIES,
      ...customCategories,
      ...sharedCategories.map((category) => ({
        ...category,
        keywords: [] as const,
      })),
    ]
      .filter((category) => !archived.has(category.name.toLowerCase()))
      .filter(
        (category, index, items) =>
          items.findIndex(
            (item) => item.name.toLowerCase() === category.name.toLowerCase()
          ) === index
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!query) {
      return allCategories;
    }

    return allCategories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.keywords.some((keyword) => keyword.includes(query))
    );
  }, [archivedNames, customCategories, sharedCategories, trimmedSearch]);
  const hasExactMatch = categories.some(
    (category) => category.name.toLowerCase() === trimmedSearch.toLowerCase()
  );

  return (
    <>
      <Stack.SearchBar
        autoCapitalize="none"
        onCancelButtonPress={() => setSearch("")}
        onChangeText={(event) => setSearch(event.nativeEvent.text)}
        placeholder="Search categories"
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        data={categories}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.name}
        ListEmptyComponent={
          isLoading ? (
            <View
              style={{
                alignItems: "center",
                flex: 1,
                justifyContent: "center",
                padding: 32,
              }}
            >
              <ActivityIndicator />
            </View>
          ) : (
            <View
              style={{
                alignItems: "center",
                flex: 1,
                justifyContent: "center",
                padding: 32,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 17 }}>
                No categories found
              </Text>
            </View>
          )
        }
        ListHeaderComponent={
          trimmedSearch && !hasExactMatch ? (
            <ThemedView
              variant="card"
              className="mb-3 overflow-hidden rounded-[22px]"
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  router.push({
                    params: { name: trimmedSearch },
                    pathname: newCategoryPathname as never,
                  });
                }}
                style={{
                  justifyContent: "center",
                  minHeight: 58,
                  paddingHorizontal: 16,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 17,
                    fontWeight: "600",
                  }}
                >
                  Add "{trimmedSearch}"
                </Text>
              </Pressable>
            </ThemedView>
          ) : null
        }
        ListFooterComponent={categories.length > 0 ? <View /> : null}
        renderItem={({ item, index }) => {
          const selected = item.name === selectedCategoryName;
          return (
            <View
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: index === 0 ? 22 : 0,
                borderTopRightRadius: index === 0 ? 22 : 0,
                borderBottomLeftRadius:
                  index === categories.length - 1 ? 22 : 0,
                borderBottomRightRadius:
                  index === categories.length - 1 ? 22 : 0,
                overflow: "hidden",
              }}
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onSelectCategory(item);
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    flexDirection: "row",
                    gap: 14,
                    minHeight: 62,
                    paddingLeft: 16,
                  }}
                >
                  <CategoryLeading color={item.color} symbol={item.symbol} />
                  <View
                    style={{
                      alignItems: "center",
                      borderBottomColor: colors.border,
                      borderBottomWidth:
                        index === categories.length - 1 ? 0 : 1,
                      flex: 1,
                      flexDirection: "row",
                      minHeight: 62,
                      paddingRight: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        flex: 1,
                        fontSize: 17,
                      }}
                    >
                      {item.name}
                    </Text>
                    {selected ? (
                      <SymbolView
                        name="checkmark"
                        size={18}
                        tintColor={colors.primary}
                      />
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </View>
          );
        }}
        style={{ backgroundColor: colors.background, flex: 1 }}
      />
    </>
  );
}
