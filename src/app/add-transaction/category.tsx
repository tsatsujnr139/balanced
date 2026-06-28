import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { api } from '../../../convex/_generated/api';
import { CategoryLeading } from '@/features/finance/components/label-form-leads';
import { useAddTransaction } from '@/features/finance/add-transaction-context';
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from '@/features/finance/transaction-categories';
import { useThemeColors } from '@/hooks/use-theme';

export default function TransactionCategoryScreen() {
  const colors = useThemeColors();
  const sharedCategories = useQuery(api.finance.listCategories);
  const { addCustomCategory, category: selectedCategory, customCategories, setCategory } =
    useAddTransaction();
  const [search, setSearch] = useState('');
  const categories = useMemo(() => {
    const query = search.trim().toLowerCase();
    const allCategories = [
      ...TRANSACTION_CATEGORIES,
      ...customCategories,
      ...(sharedCategories ?? []).map((category) => ({ ...category, keywords: [] as const })),
    ]
      .filter(
        (category, index, items) =>
          items.findIndex(
            (item) => item.name.toLocaleLowerCase() === category.name.toLocaleLowerCase()
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

  const renderCategory = ({ item, index }: { item: TransactionCategory; index: number }) => {
    const selected = item.name === selectedCategory;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          addCustomCategory(item);
          setCategory(item.name);
          router.back();
        }}>
        <View
          style={{
            minHeight: 62,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            paddingLeft: 16,
          }}>
          <CategoryLeading color={item.color} symbol={item.symbol} />
          <View
            style={{
              minHeight: 62,
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              borderBottomColor: colors.border,
              borderBottomWidth: index === categories.length - 1 ? 0 : 1,
              paddingRight: 16,
            }}>
            <Text style={{ color: colors.foreground, flex: 1, fontSize: 17 }}>
              {item.name}
            </Text>
            {selected ? (
              <SymbolView name="checkmark" size={18} tintColor={colors.primary} />
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
          setSearch('');
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 }}
        data={categories}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.name}
        ListHeaderComponent={
          search.trim() &&
          !categories.some(
            (category) => category.name.toLocaleLowerCase() === search.trim().toLocaleLowerCase()
          ) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                router.push({
                  pathname: '/add-transaction/category-new',
                  params: { name: search.trim() },
                });
              }}
              style={{ minHeight: 58, justifyContent: 'center', paddingHorizontal: 16 }}>
              <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>
                Add “{search.trim()}”
              </Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }}>
            <Text style={{ color: colors.muted, fontSize: 17 }}>No categories found</Text>
          </View>
        }
        renderItem={renderCategory}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
    </>
  );
}
