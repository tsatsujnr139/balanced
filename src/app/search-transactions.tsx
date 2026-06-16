import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';

import { useThemeColors } from '@/hooks/use-theme';

const SEARCH_SUGGESTIONS = [
  'Whole Foods',
  'Acme Payroll',
  'Uber',
  'Netflix',
  'Transfer to Savings',
];

export default function SearchTransactionsScreen() {
  const colors = useThemeColors();
  const searchBarRef = useRef<SearchBarCommands | null>(null);
  const [query, setQuery] = useState('');
  const filtered = SEARCH_SUGGESTIONS.filter((item) =>
    item.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchBarRef.current?.focus();
    }, 250);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120,
          paddingTop: 18,
        }}
        style={{ flex: 1, backgroundColor: colors.background }}>
        <Text
          selectable
          style={{
            color: colors.muted,
            fontSize: 13,
            fontWeight: '700',
            marginBottom: 12,
            textTransform: 'uppercase',
          }}>
          Transactions
        </Text>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 22,
            borderCurve: 'continuous',
            overflow: 'hidden',
          }}>
          {(query ? filtered : SEARCH_SUGGESTIONS).map((item, index, list) => (
            <View
              key={item}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 16,
                borderBottomColor: colors.border,
                borderBottomWidth: index === list.length - 1 ? 0 : 1,
              }}>
              <Text selectable style={{ color: colors.foreground, fontSize: 17, fontWeight: '600' }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Stack.Screen options={{ headerTransparent: true, title: 'Search' }} />
      <Stack.SearchBar
        allowToolbarIntegration
        autoCapitalize="none"
        autoFocus
        hideNavigationBar
        onCancelButtonPress={() => {
          setQuery('');
        }}
        onChangeText={(event) => {
          setQuery(event.nativeEvent.text);
        }}
        placeholder="Search transactions"
        placement="automatic"
        ref={searchBarRef}
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot separateBackground />
        <Stack.Toolbar.Button
          accessibilityLabel="Close search"
          icon="xmark"
          onPress={() => {
            router.back();
          }}
          separateBackground
        />
      </Stack.Toolbar>
    </>
  );
}
