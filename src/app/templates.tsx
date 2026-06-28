import { useQuery } from 'convex/react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';

import { api } from '../../convex/_generated/api';
import { TransactionTemplateList } from '@/features/finance/components/transaction-template-list';
import type { TransactionTemplate } from '@/features/finance/types';
import { useThemeColors } from '@/hooks/use-theme';

const SEARCH_FOCUS_DELAY_MS = 200;

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
      template.merchant.toLowerCase().includes(normalized)
  );
}

export default function TemplatesScreen() {
  const colors = useThemeColors();
  const { focusSearch } = useLocalSearchParams<{ focusSearch?: string }>();
  const searchBarRef = useRef<SearchBarCommands | null>(null);
  const [query, setQuery] = useState('');
  const templates = useQuery(api.finance.listTransactionTemplates);
  const filtered = useMemo(
    () => filterTemplates(templates ?? [], query),
    [query, templates]
  );
  const shouldFocusSearch = focusSearch === '1';

  useFocusEffect(
    useCallback(() => {
      if (!shouldFocusSearch) {
        return;
      }
      const timeout = setTimeout(() => {
        searchBarRef.current?.focus();
      }, SEARCH_FOCUS_DELAY_MS);
      return () => {
        clearTimeout(timeout);
      };
    }, [shouldFocusSearch])
  );

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: 18, paddingHorizontal: 20, paddingBottom: 40 }}
        keyboardDismissMode="interactive"
        style={{ flex: 1, backgroundColor: colors.background }}>
        {templates === undefined ? (
          <View style={{ minHeight: 160, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : (
          <TransactionTemplateList
            emptyText="No templates yet"
            templates={filtered}
            onPressTemplate={(template) => {
              router.push({ pathname: '/add-template', params: { id: template.id } });
            }}
          />
        )}
      </ScrollView>

      <Stack.Screen.BackButton displayMode="minimal" />
      <Stack.Screen.Title large>Templates</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Add template"
          icon="plus"
          onPress={() => {
            router.push('/add-template');
          }}
        />
      </Stack.Toolbar>
      <Stack.SearchBar
        autoCapitalize="none"
        onCancelButtonPress={() => {
          setQuery('');
          searchBarRef.current?.blur();
        }}
        onChangeText={(event) => {
          setQuery(event.nativeEvent.text);
        }}
        placeholder="Search templates"
        ref={searchBarRef}
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
    </>
  );
}
