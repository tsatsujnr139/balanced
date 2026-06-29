import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useMemo, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import type { SearchBarCommands } from "react-native-screens";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BUDGET_PERIOD_LABEL,
  BUDGET_PERIOD_ORDER,
} from "@/features/finance/budget-constants";
import {
  BudgetList,
  BudgetProgressRow,
} from "@/features/finance/components/budget-list";
import { filterBudgets } from "@/features/finance/filter-budgets";
import type { Budget, BudgetPeriod } from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

const SEARCH_FOCUS_DELAY_MS = 200;

function groupBudgetsByPeriod(budgets: Budget[]): [BudgetPeriod, Budget[]][] {
  const byPeriod = new Map<BudgetPeriod, Budget[]>();
  for (const budget of budgets) {
    const list = byPeriod.get(budget.period) ?? [];
    list.push(budget);
    byPeriod.set(budget.period, list);
  }

  return [...byPeriod.entries()]
    .sort(([a], [b]) => BUDGET_PERIOD_ORDER[a] - BUDGET_PERIOD_ORDER[b])
    .map(([period, list]) => [
      period,
      [...list].sort((a, b) => a.name.localeCompare(b.name)),
    ]);
}

export default function BudgetsScreen() {
  const colors = useThemeColors();
  const { focusSearch } = useLocalSearchParams<{ focusSearch?: string }>();
  const searchBarRef = useRef<SearchBarCommands | null>(null);
  const [query, setQuery] = useState("");
  const { budgets } = useFinance();
  const filteredBudgets = filterBudgets(budgets, query);
  const groups = useMemo(
    () => groupBudgetsByPeriod(filteredBudgets),
    [filteredBudgets]
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
        {filteredBudgets.length === 0 ? (
          <BudgetList budgets={filteredBudgets} />
        ) : (
          groups.map(([period, periodBudgets]) => (
            <ThemedView
              key={period}
              variant="card"
              className="rounded-[22px] p-4"
            >
              <ThemedText
                type="subtitle"
                className="mb-3 text-[20px] leading-7"
              >
                {BUDGET_PERIOD_LABEL[period]}
              </ThemedText>
              <View
                className="mb-4 h-px"
                style={{ backgroundColor: colors.border }}
              />
              {periodBudgets.map((budget, index) => (
                <View
                  key={budget.id}
                  className={
                    index < periodBudgets.length - 1 ? "mb-5" : undefined
                  }
                >
                  <BudgetProgressRow
                    budget={budget}
                    onPress={() => {
                      router.push({
                        params: { id: budget.id },
                        pathname: "/budget/[id]",
                      });
                    }}
                  />
                </View>
              ))}
            </ThemedView>
          ))
        )}
      </ScrollView>

      <Stack.Screen.BackButton displayMode="minimal" />
      <Stack.Screen.Title large>Budgets</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Add budget"
          icon="plus"
          onPress={() => {
            router.push("/add-budget");
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
        placeholder="Search budgets"
        placement="automatic"
        ref={searchBarRef}
      />
    </>
  );
}
