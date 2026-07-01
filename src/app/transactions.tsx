import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import type { SearchBarCommands } from "react-native-screens";

import { api } from "@/convex/_generated/api";
import { TransactionList } from "@/features/finance/components/transaction-list";
import { filterTransactions } from "@/features/finance/filter-transactions";
import { useThemeColors } from "@/hooks/use-theme";

export default function TransactionsScreen() {
  const colors = useThemeColors();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const searchBarRef = useRef<SearchBarCommands | null>(null);
  const [query, setQuery] = useState(q ?? "");
  const transactions = useQuery(api.finance.listTransactions);
  const filteredTransactions = filterTransactions(transactions ?? [], query);

  useEffect(() => {
    if (q) {
      searchBarRef.current?.setText(q);
    }
  }, [q]);

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
        {transactions === undefined ? (
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
          <TransactionList transactions={filteredTransactions} />
        )}
      </ScrollView>

      <Stack.Screen.BackButton displayMode="minimal" />
      <Stack.Screen.Title large>Transactions</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Add transaction"
          icon="plus"
          onPress={() => {
            router.push("/add-transaction");
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
        placeholder="Search transactions"
        placement="automatic"
        ref={searchBarRef}
      />
    </>
  );
}
