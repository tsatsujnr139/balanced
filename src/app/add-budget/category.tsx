import { useQuery } from "convex/react";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { useAddBudget } from "@/features/finance/add-budget-context";
import { CategoryLeading } from "@/features/finance/components/label-form-leads";
import { TRANSACTION_CATEGORIES } from "@/features/finance/transaction-categories";
import type { TransactionCategory } from "@/features/finance/transaction-categories";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../../convex/_generated/api";

export default function BudgetCategoryScreen() {
  const colors = useThemeColors();
  const sharedCategories = useQuery(api.finance.listCategories);
  const { category: selectedCategory, setCategory } = useAddBudget();
  const [search, setSearch] = useState("");
  const categories = useMemo(() => {
    const query = search.trim().toLowerCase();
    const allCategories = [
      ...TRANSACTION_CATEGORIES,
      ...(sharedCategories ?? []).map((category) => ({
        ...category,
        keywords: [] as const,
      })),
    ]
      .filter(
        (category, index, items) =>
          items.findIndex(
            (item) =>
              item.name.toLocaleLowerCase() ===
              category.name.toLocaleLowerCase()
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
  }, [search, sharedCategories]);

  const renderCategory = ({
    item,
    index,
  }: {
    item: TransactionCategory;
    index: number;
  }) => {
    const selected = item.name === selectedCategory?.name;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setCategory({
            color: item.color,
            name: item.name,
            symbol: item.symbol,
          });
          router.back();
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
              borderBottomWidth: index === categories.length - 1 ? 0 : 1,
              flex: 1,
              flexDirection: "row",
              minHeight: 62,
              paddingRight: 16,
            }}
          >
            <Text style={{ color: colors.foreground, flex: 1, fontSize: 17 }}>
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
    );
  };

  return (
    <>
      <Stack.SearchBar
        autoCapitalize="none"
        onCancelButtonPress={() => {
          setSearch("");
        }}
        onChangeText={(event) => {
          setSearch(event.nativeEvent.text);
        }}
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
          <View
            style={{
              alignItems: "center",
              flex: 1,
              gap: 14,
              justifyContent: "center",
              padding: 32,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 17 }}>
              No categories found
            </Text>
          </View>
        }
        renderItem={renderCategory}
        style={{ backgroundColor: colors.background, flex: 1 }}
      />
    </>
  );
}
