import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { api } from '../../../convex/_generated/api';
import { useAddPlannedPayment } from '@/features/finance/add-planned-payment-context';
import { CategoryLeading } from '@/features/finance/components/label-form-leads';
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategory,
} from '@/features/finance/transaction-categories';
import { useThemeColors } from '@/hooks/use-theme';

export default function PlannedPaymentCategoryScreen() {
  const colors = useThemeColors();
  const sharedCategories = useQuery(api.finance.listCategories);
  const { category: selectedCategory, setCategory } = useAddPlannedPayment();
  const [search, setSearch] = useState('');
  const categories = useMemo(() => {
    const query = search.trim().toLowerCase();
    const allCategories = [
      ...TRANSACTION_CATEGORIES,
      ...(sharedCategories ?? []).map((category) => ({ ...category, keywords: [] as const })),
    ]
      .filter(
        (category, index, items) =>
          items.findIndex(
            (item) => item.name.toLocaleLowerCase() === category.name.toLocaleLowerCase()
          ) === index
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!query) return allCategories;

    return allCategories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.keywords.some((keyword) => keyword.includes(query))
    );
  }, [search, sharedCategories]);

  const renderCategory = ({ item, index }: { item: TransactionCategory; index: number }) => {
    const selected = item.name === selectedCategory?.name;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setCategory({ name: item.name, symbol: item.symbol, color: item.color });
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
            <Text style={{ color: colors.foreground, flex: 1, fontSize: 17 }}>{item.name}</Text>
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
        onCancelButtonPress={() => setSearch('')}
        onChangeText={(event) => setSearch(event.nativeEvent.text)}
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
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Text style={{ color: colors.muted, fontSize: 17 }}>No categories found</Text>
          </View>
        }
        renderItem={renderCategory}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
    </>
  );
}
