import { SymbolView } from 'expo-symbols';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import {
  budgetUsage,
  formatCompactCurrency,
  formatCurrency,
  formatTransactionDate,
} from '@/features/finance/format';
import type { Account } from '@/features/finance/types';
import { useFinance } from '@/features/finance/use-finance';
import { useThemeColors } from '@/hooks/use-theme';
import { cn } from '@/lib/cn';

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit',
  investment: 'Investing',
  cash: 'Cash',
};

const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 10;
const ROW_GAP = 10;
const PAGE_GAP = 10;
const ACCOUNT_PAGE_PEEK = 28;
const GRID_COLUMNS = 2;
const GRID_ROWS = 2;
const ACCOUNTS_PER_PAGE = GRID_COLUMNS * GRID_ROWS;

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

function AccountCard({
  account,
  width,
}: {
  account: Account;
  width: number;
}) {
  return (
    <ThemedView variant="card" className="gap-1.5 rounded-2xl px-3 py-2.5" style={{ width }}>
      <View className="flex-row items-center justify-between">
        <View
          className="size-7 items-center justify-center rounded-full"
          style={{ backgroundColor: account.color }}>
          <SymbolView name={account.symbol as never} size={13} tintColor="#fff" />
        </View>
        <ThemedText type="small" color="muted" className="text-[11px]">
          {ACCOUNT_TYPE_LABEL[account.type]}
        </ThemedText>
      </View>
      <View className="gap-0">
        <ThemedText type="small" color="muted" className="text-[13px]">
          {account.name}
        </ThemedText>
        <ThemedText
          type="smallBold"
          color={account.balance < 0 ? 'negative' : 'foreground'}
          className="text-lg leading-6">
          {formatCurrency(account.balance)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

export default function DashboardScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - HORIZONTAL_PADDING * 2, MaxContentWidth);
  const carouselWidth = Math.min(width, MaxContentWidth + HORIZONTAL_PADDING * 2);
  const pageWidth = contentWidth - ACCOUNT_PAGE_PEEK;
  const cardWidth = (pageWidth - COLUMN_GAP) / GRID_COLUMNS;
  const { accounts, transactions, budgets, netWorth, totalAssets, totalLiabilities } = useFinance();
  const accountPages = chunk(accounts, ACCOUNTS_PER_PAGE);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="items-center px-4"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: insets.bottom + BottomTabInset + 24,
      }}>
      <View className="w-full gap-6" style={{ maxWidth: MaxContentWidth }}>
        <View className="gap-1">
          <ThemedText type="smallBold" color="muted" className="text-[15px]">
            Balance
          </ThemedText>
          <ThemedText type="title" className="text-[34px] leading-[40px]">
            {formatCurrency(netWorth)}
          </ThemedText>
          <View className="mt-0.5 flex-row gap-4">
            <View className="flex-row items-center gap-1">
              <SymbolView name="arrow.up.right" size={12} tintColor={colors.positive} />
              <ThemedText type="small" color="muted">
                Income {formatCompactCurrency(totalAssets)}
              </ThemedText>
            </View>
            <View className="flex-row items-center gap-1">
              <SymbolView name="arrow.down.right" size={12} tintColor={colors.negative} />
              <ThemedText type="small" color="muted">
                Expenses {formatCompactCurrency(totalLiabilities)}
              </ThemedText>
            </View>
          </View>
        </View>

        <View className="gap-2">
          <ThemedText type="subtitle" className="text-[22px] leading-7">
            Accounts
          </ThemedText>
          <ScrollView
            horizontal
            decelerationRate="fast"
            nestedScrollEnabled
            snapToAlignment="start"
            snapToInterval={pageWidth + PAGE_GAP}
            showsHorizontalScrollIndicator={false}
            style={{ width: carouselWidth, marginLeft: -HORIZONTAL_PADDING }}
            contentContainerStyle={{
              gap: PAGE_GAP,
              paddingLeft: HORIZONTAL_PADDING,
              paddingRight: HORIZONTAL_PADDING + PAGE_GAP,
            }}>
            {accountPages.map((page, pageIndex) => (
              <View key={pageIndex} style={{ width: pageWidth, gap: ROW_GAP }}>
                {chunk(page, GRID_COLUMNS).map((row, rowIndex) => (
                  <View key={rowIndex} className="flex-row" style={{ gap: COLUMN_GAP }}>
                    {row.map((account) => (
                      <AccountCard key={account.id} account={account} width={cardWidth} />
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>

        <View className="gap-2">
          <ThemedText type="subtitle" className="text-[22px] leading-7">
            Recent transactions
          </ThemedText>
          <ThemedView variant="card" className="rounded-[22px] p-4">
            {transactions.map((txn, index) => (
              <View
                key={txn.id}
                className={cn('flex-row items-center gap-2', index < transactions.length - 1 && 'mb-4')}>
                <View
                  className="size-[38px] items-center justify-center rounded-full"
                  style={{ backgroundColor: txn.color }}>
                  <SymbolView name={txn.symbol as never} size={16} tintColor="#fff" />
                </View>
                <View className="min-w-0 flex-1 gap-0.5">
                  <ThemedText type="smallBold">{txn.merchant}</ThemedText>
                  <ThemedText type="small" color="muted">
                    {txn.category} · {formatTransactionDate(txn.date)}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" color={txn.amount > 0 ? 'positive' : 'foreground'}>
                  {formatCurrency(txn.amount, txn.currency, { signed: true })}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
        </View>

        <View className="gap-2">
          <ThemedText type="subtitle" className="text-[22px] leading-7">
            Budgets
          </ThemedText>
          <ThemedView variant="card" className="rounded-[22px] p-4">
            {budgets.map((budget, index) => {
              const usage = budgetUsage(budget.spent, budget.limit);
              const overBudget = budget.spent > budget.limit;
              return (
                <View key={budget.id} className={cn(index < budgets.length - 1 && 'mb-6')}>
                  <View className="mb-2 flex-row items-center gap-2">
                    <View
                      className="size-[26px] items-center justify-center rounded-full"
                      style={{ backgroundColor: budget.color }}>
                      <SymbolView name={budget.symbol as never} size={12} tintColor="#fff" />
                    </View>
                    <ThemedText type="smallBold" className="flex-1">
                      {budget.name}
                    </ThemedText>
                    <ThemedText type="small" color="muted">
                      {formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}
                    </ThemedText>
                  </View>
                  <View className="h-2 overflow-hidden rounded bg-border">
                    <View
                      className="h-2 rounded"
                      style={{
                        width: `${usage}%`,
                        backgroundColor: overBudget ? colors.negative : budget.color,
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </ThemedView>
        </View>
      </View>
    </ScrollView>
  );
}
