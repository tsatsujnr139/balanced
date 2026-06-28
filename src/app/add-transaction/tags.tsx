import { useQuery } from 'convex/react';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { api } from '../../../convex/_generated/api';
import { ColorLeading } from '@/features/finance/components/label-form-leads';
import { useAddTransaction } from '@/features/finance/add-transaction-context';
import { useThemeColors } from '@/hooks/use-theme';

export default function TransactionTagsScreen() {
  const colors = useThemeColors();
  const availableTags = useQuery(api.finance.listTags);
  const { tags: selectedTags, toggleTag } = useAddTransaction();
  const [search, setSearch] = useState('');
  const tags = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (availableTags ?? [])
      .filter((tag) => !query || tag.name.toLocaleLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableTags, search]);
  const hasExactMatch = (availableTags ?? []).some(
    (tag) => tag.name.toLocaleLowerCase() === search.trim().toLocaleLowerCase()
  );

  return (
    <>
      <Stack.SearchBar
        autoCapitalize="none"
        onCancelButtonPress={() => setSearch('')}
        onChangeText={(event) => setSearch(event.nativeEvent.text)}
        placeholder="Search tags"
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 }}
        data={tags}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          search.trim() && !hasExactMatch ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                router.push({
                  pathname: '/add-transaction/tag-new',
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
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 }}>
            <SymbolView name="tag" size={32} tintColor={colors.muted} />
            <Text style={{ color: colors.muted, fontSize: 17 }}>
              {(availableTags ?? []).length === 0 && !search.trim() ? 'No tags yet' : 'No tags found'}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const selected = selectedTags.some((tag) => tag.id === item.id);
          return (
            <Pressable accessibilityRole="checkbox" onPress={() => toggleTag(item)}>
              <View
                style={{
                  minHeight: 62,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingLeft: 16,
                }}>
                <ColorLeading color={item.color} />
                <View
                  style={{
                    minHeight: 62,
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderBottomColor: colors.border,
                    borderBottomWidth: index === tags.length - 1 ? 0 : 1,
                    paddingRight: 16,
                  }}>
                  <Text style={{ flex: 1, color: colors.foreground, fontSize: 17 }}>{item.name}</Text>
                  {selected ? (
                    <SymbolView name="checkmark" size={18} tintColor={colors.primary} />
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        }}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
    </>
  );
}
