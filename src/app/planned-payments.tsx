import { useQuery } from "convex/react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import type { SearchBarCommands } from "react-native-screens";

import { api } from "@/convex/_generated/api";
import { PlannedPaymentList } from "@/features/finance/components/planned-payment-list";
import type { PlannedPayment } from "@/features/finance/types";
import { useThemeColors } from "@/hooks/use-theme";

const SEARCH_FOCUS_DELAY_MS = 200;

function filterPlannedPayments(
  payments: PlannedPayment[],
  query: string
): PlannedPayment[] {
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
  const [query, setQuery] = useState("");
  const plannedPayments = useQuery(api.finance.listPlannedPayments);
  const filtered = useMemo(
    () => filterPlannedPayments(plannedPayments ?? [], query),
    [plannedPayments, query]
  );
  const shouldFocusSearch = focusSearch === "1";

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
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          gap: 18,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        keyboardDismissMode="interactive"
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        {plannedPayments === undefined ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              minHeight: 160,
            }}
          >
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
              params: { draftId: `new-${Date.now()}` },
              pathname: "/add-planned-payment",
            });
          }}
        />
      </Stack.Toolbar>
      <Stack.SearchBar
        autoCapitalize="none"
        onCancelButtonPress={() => {
          setQuery("");
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
