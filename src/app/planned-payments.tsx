import { useQuery } from 'convex/react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';

import { api } from '../../convex/_generated/api';
import { PlannedPaymentList } from '@/features/finance/components/planned-payment-list';
import type { PlannedPayment } from '@/features/finance/types';
import { useThemeColors } from '@/hooks/use-theme';

const SEARCH_FOCUS_DELAY_MS = 200;

function filterPlannedPayments(payments: PlannedPayment[], query: string): PlannedPayment[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return payments;
  }
  return payments.filter(
    (payment) =>
      payment.name.toLowerCase().includes(normalized) ||
      payment.category.toLowerCase().includes(normalized) ||
      payment.accountName.toLowerCase().includes(normalized)
  );
}

export default function PlannedPaymentsScreen() {
  const colors = useThemeColors();
  const { focusSearch } = useLocalSearchParams<{ focusSearch?: string }>();
  const searchBarRef = useRef<SearchBarCommands | null>(null);
  const [query, setQuery] = useState('');
  const plannedPayments = useQuery(api.finance.listPlannedPayments);
  const filtered = useMemo(
    () => filterPlannedPayments(plannedPayments ?? [], query),
    [plannedPayments, query]
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
        {plannedPayments === undefined ? (
          <View style={{ minHeight: 160, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : (
          <PlannedPaymentList plannedPayments={filtered} />
        )}
      </ScrollView>

      <Stack.Screen.BackButton displayMode="minimal" />
      <Stack.Screen.Title large>Planned Payments</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Add planned payment"
          icon="plus"
          onPress={() => {
            router.push({
              pathname: '/add-planned-payment',
              params: { draftId: `new-${Date.now()}` },
            });
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
        placeholder="Search planned payments"
        ref={searchBarRef}
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
    </>
  );
}
