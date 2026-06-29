import { useQuery } from "convex/react";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

import { useAddTransaction } from "@/features/finance/add-transaction-context";
import { CategoryLeading } from "@/features/finance/components/label-form-leads";
import { TRANSACTION_CATEGORIES } from "@/features/finance/transaction-categories";
import type { TransactionCategory } from "@/features/finance/transaction-categories";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../../convex/_generated/api";

export default function TransactionCategoryScreen() {
  const colors = useThemeColors();
  const sharedCategories = useQuery(api.finance.listCategories);
  const {
    addCustomCategory,
    category: selectedCategory,
    customCategories,
    setCategory,
  } = useAddTransaction();
  const [search, setSearch] = useState("");
  const categories = useMemo(() => {
    const query = search.trim().toLowerCase();
    const allCategories = [
      ...TRANSACTION_CATEGORIES,
      ...customCategories,
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
  }, [customCategories, search, sharedCategories]);

  const renderCategory = ({
    item,
    index,
  }: {
    item: TransactionCategory;
    index: number;
  }) => {
    const selected = item.name === selectedCategory;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          addCustomCategory(item);
          setCategory(item.name);
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
        ListHeaderComponent={
          search.trim() &&
          !categories.some(
            (category) =>
              category.name.toLocaleLowerCase() ===
              search.trim().toLocaleLowerCase()
          ) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                router.push({
                  params: { name: search.trim() },
                  pathname: "/add-transaction/category-new",
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
                Add “{search.trim()}”
              </Text>
            </Pressable>
          ) : null
        }
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
