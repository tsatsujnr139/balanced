import { usePaginatedQuery } from 'convex/react';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { TransactionList } from '@/features/finance/components/transaction-list';
import { formatCurrency } from '@/features/finance/format';
import { maskCurrencyValue, useBalanceVisibility } from '@/features/finance/use-balance-visibility';
import { useFinance } from '@/features/finance/use-finance';
import { useThemeColors } from '@/hooks/use-theme';

export default function AccountScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Array.isArray(id) ? id[0] : id;
  const { accounts, isLoading: isLoadingAccounts } = useFinance();
  const { isBalanceVisible, toggleBalanceVisibility } = useBalanceVisibility();
  const account = accounts.find((item) => item.id === accountId);
  const accountBalance = account ? formatCurrency(account.balance, account.currency) : '';
  const {
    results: transactions,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.finance.listAccountTransactions,
    accountId ? { accountId: accountId as Id<'accounts'> } : 'skip',
    { initialNumItems: 10 }
  );

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ gap: 24, paddingHorizontal: 20, paddingBottom: 40 }}
        style={{ flex: 1, backgroundColor: colors.background }}>
        {isLoadingAccounts || !account ? (
          <View style={{ minHeight: 180, alignItems: 'center', justifyContent: 'center' }}>
            {isLoadingAccounts ? (
              <ActivityIndicator />
            ) : (
              <Text style={{ color: colors.muted, fontSize: 17 }}>Account not found</Text>
            )}
          </View>
        ) : (
          <>
            <View
              style={{
                padding: 20,
                borderRadius: 24,
                borderCurve: 'continuous',
                backgroundColor: colors.card,
              }}>
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.muted, fontSize: 14 }}>Account balance</Text>
                  <Pressable
                    accessibilityRole="switch"
                    accessibilityState={{ checked: isBalanceVisible }}
                    accessibilityLabel={isBalanceVisible ? 'Hide balances' : 'Show balances'}
                    hitSlop={8}
                    onPress={toggleBalanceVisibility}
                    style={({ pressed }) => ({
                      height: 34,
                      width: 34,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 17,
                      backgroundColor: colors.background,
                      opacity: pressed ? 0.65 : 1,
                    })}>
                    <SymbolView
                      name={(isBalanceVisible ? 'eye' : 'eye.slash') as never}
                      size={18}
                      tintColor={colors.muted}
                    />
                  </Pressable>
                </View>
                <Text
                  style={{
                    color: account.balance < 0 ? colors.negative : colors.foreground,
                    fontSize: 36,
                    fontWeight: '700',
                    fontVariant: ['tabular-nums'],
                  }}>
                  {isBalanceVisible ? accountBalance : maskCurrencyValue(accountBalance)}
                </Text>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: '700' }}>
                Transactions
              </Text>
              {status === 'LoadingFirstPage' ? (
                <View style={{ minHeight: 96, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator />
                </View>
              ) : (
                <TransactionList transactions={transactions} />
              )}
              {status === 'CanLoadMore' || status === 'LoadingMore' ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={status === 'LoadingMore'}
                  onPress={() => {
                    loadMore(10);
                  }}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed || status === 'LoadingMore' ? 0.6 : 1,
                  })}>
                  {status === 'LoadingMore' ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '600' }}>
                      Show more
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      <Stack.Screen.Title>{account?.name ?? 'Account'}</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Edit account"
          disabled={!accountId}
          onPress={() => {
            if (!accountId) {
              return;
            }

            router.push({ pathname: '/add-account', params: { id: accountId } });
          }}>
          Edit
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
