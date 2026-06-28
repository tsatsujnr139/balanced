import { useQuery } from 'convex/react';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { api } from '../../../convex/_generated/api';
import { useAddPlannedPayment } from '@/features/finance/add-planned-payment-context';
import { ColorLeading } from '@/features/finance/components/label-form-leads';
import { useThemeColors } from '@/hooks/use-theme';

export default function PlannedPaymentTagsScreen() {
  const colors = useThemeColors();
  const availableTags = useQuery(api.finance.listTags);
  const { tags: selectedTags, toggleTag } = useAddPlannedPayment();
  const [search, setSearch] = useState('');
  const tags = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (availableTags ?? [])
      .filter((tag) => !query || tag.name.toLocaleLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableTags, search]);

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
