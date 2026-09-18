import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import type { DimensionValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon as SymbolView } from "@/components/icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  DEFAULT_ACCOUNT_COLOR,
  ACCOUNT_TYPE_LABEL,
} from "@/features/finance/account-constants";
import { AccountGrid } from "@/features/finance/components/account-grid";
import type { AccountGridLayout } from "@/features/finance/components/account-grid";
import { BudgetList } from "@/features/finance/components/budget-list";
import { TransactionList } from "@/features/finance/components/transaction-list";
import { DEFAULT_CURRENCY, formatCurrency } from "@/features/finance/format";
import type { Account } from "@/features/finance/types";
import {
  maskCurrencyValue,
  useBalanceVisibility,
} from "@/features/finance/use-balance-visibility";
import { useFinance } from "@/features/finance/use-finance";
import type { CurrencyBalance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

const HORIZONTAL_PADDING = 20;
const COLUMN_GAP = 10;
const ROW_GAP = 10;
const PAGE_GAP = 10;
const ACCOUNT_PAGE_PEEK = 28;
const GRID_COLUMNS = 2;
const ACCOUNT_CARD_HEIGHT = 104;
const DEFAULT_NEW_ACCOUNT_PARAMS = {
  balance: "0.00",
  color: DEFAULT_ACCOUNT_COLOR,
  currency: DEFAULT_CURRENCY,
  name: "My Account",
  type: "cash",
} as const;

function SkeletonBlock({
  height,
  width = "100%",
  borderRadius = 10,
}: {
  height: number;
  width?: DimensionValue;
  borderRadius?: number;
}) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.border,
        borderRadius,
        height,
        opacity: 0.65,
        width,
      }}
    />
  );
}

function ListSkeleton({ rows = 3 }: { rows?: number }) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderCurve: "continuous",
        borderRadius: 22,
        gap: 16,
        padding: 16,
      }}
    >
      {Array.from({ length: rows }, (_, index) => (
        <View
          key={index}
          style={{ alignItems: "center", flexDirection: "row", gap: 10 }}
        >
          <SkeletonBlock height={38} width={38} borderRadius={19} />
          <View style={{ flex: 1, gap: 7 }}>
            <SkeletonBlock height={13} width="55%" />
            <SkeletonBlock height={11} width="38%" />
          </View>
          <SkeletonBlock height={13} width={64} />
        </View>
      ))}
    </View>
  );
}

function AccountGridSkeleton({ cardWidth }: { cardWidth: number }) {
  return (
    <View style={{ gap: ROW_GAP }}>
      {[0, 1].map((row) => (
        <View key={row} style={{ flexDirection: "row", gap: COLUMN_GAP }}>
          <SkeletonBlock
            height={ACCOUNT_CARD_HEIGHT}
            width={cardWidth}
            borderRadius={16}
          />
          <SkeletonBlock
            height={ACCOUNT_CARD_HEIGHT}
            width={cardWidth}
            borderRadius={16}
          />
        </View>
      ))}
    </View>
  );
}

function buildNewAccountParams() {
  return {
    ...DEFAULT_NEW_ACCOUNT_PARAMS,
    draftId: `new-${Date.now()}`,
  };
}

function AccountCard({
  account,
  isBalanceVisible,
}: {
  account: Account;
  isBalanceVisible: boolean;
}) {
  const balance = formatCurrency(account.balance, account.currency);

  return (
    <ThemedView
      variant="card"
      className="h-full w-full justify-between rounded-2xl px-3.5 py-3"
    >
      <View className="flex-row items-center justify-between">
        <View
          className="size-8 items-center justify-center rounded-full"
          style={{ backgroundColor: account.color }}
        >
          <SymbolView
            name={account.symbol as never}
            size={15}
            tintColor="#fff"
          />
        </View>
        <ThemedText
          type="small"
          color="muted"
          numberOfLines={1}
          className="text-xs leading-4"
        >
          {ACCOUNT_TYPE_LABEL[account.type]}
        </ThemedText>
      </View>
      <View className="gap-0">
        <ThemedText
          type="small"
          color="muted"
          numberOfLines={1}
          className="text-[15px] leading-5"
        >
          {account.name}
        </ThemedText>
        <ThemedText
          type="smallBold"
          color={account.balance < 0 ? "negative" : "foreground"}
          numberOfLines={1}
          adjustsFontSizeToFit
          className="text-xl leading-7"
        >
          {isBalanceVisible ? balance : maskCurrencyValue(balance)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

function AddAccountCard({ width }: { width: number }) {
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add account"
      style={{ height: ACCOUNT_CARD_HEIGHT, width }}
      onPress={() => {
        router.push({
          params: buildNewAccountParams(),
          pathname: "/add-account",
        });
      }}
    >
      <ThemedView
        variant="card"
        className="h-full items-center justify-center gap-2 rounded-2xl px-3.5 py-3"
        style={{ width }}
      >
        <View
          className="size-8 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.border }}
        >
          <SymbolView name="plus" size={15} tintColor={colors.muted} />
        </View>
        <ThemedText
          type="small"
          color="muted"
          className="text-[15px] leading-5"
        >
          Add account
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function CurrencyBalanceCard({
  item,
  isBalanceVisible,
}: {
  item: CurrencyBalance;
  isBalanceVisible: boolean;
}) {
  const colors = useThemeColors();
  const netWorthValue = formatCurrency(item.netWorth, item.currency);
  const totalInValue = formatCurrency(item.totalIn, item.currency);
  const totalOutValue = formatCurrency(item.totalOut, item.currency);

  return (
    <View className="gap-1" style={{ width: 220 }}>
      <ThemedText
        type="title"
        numberOfLines={1}
        adjustsFontSizeToFit
        className="text-[34px] leading-[40px]"
      >
        {isBalanceVisible ? netWorthValue : maskCurrencyValue(netWorthValue)}
      </ThemedText>
      <View className="mt-0.5 flex-row gap-4">
        <View className="flex-row items-center gap-1">
          <SymbolView
            name="arrow.up.right"
            size={12}
            tintColor={colors.positive}
          />
          <ThemedText type="small" color="muted">
            {item.currency}{" "}
            {isBalanceVisible ? totalInValue : maskCurrencyValue(totalInValue)}
          </ThemedText>
        </View>
        <View className="flex-row items-center gap-1">
          <SymbolView
            name="arrow.down.right"
            size={12}
            tintColor={colors.negative}
          />
          <ThemedText type="small" color="muted">
            {isBalanceVisible
              ? totalOutValue
              : maskCurrencyValue(totalOutValue)}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(
    width - HORIZONTAL_PADDING * 2,
    MaxContentWidth
  );
  const carouselWidth = Math.min(
    width,
    MaxContentWidth + HORIZONTAL_PADDING * 2
  );
  const pageWidth = contentWidth - ACCOUNT_PAGE_PEEK;
  const cardWidth = (pageWidth - COLUMN_GAP) / GRID_COLUMNS;
  const { accounts, transactions, budgets, balanceByCurrency, isLoading } =
    useFinance();
  const { isBalanceVisible, toggleBalanceVisibility } = useBalanceVisibility();
  const reorderAccounts = useMutation(api.finance.reorderAccounts);
  const [isReorderingAccounts, setIsReorderingAccounts] = useState(false);

  const accountGridLayout = useMemo<AccountGridLayout>(
    () => ({
      cardHeight: ACCOUNT_CARD_HEIGHT,
      cardWidth,
      columnGap: COLUMN_GAP,
      pageGap: PAGE_GAP,
      pageWidth,
      rowGap: ROW_GAP,
    }),
    [cardWidth, pageWidth]
  );

  const handlePressAccount = useCallback((account: Account) => {
    router.push({
      params: { id: account.id },
      pathname: "/account/[id]",
    });
  }, []);

  const handleReorderAccounts = useCallback(
    (ids: string[]) => {
      const current = accounts.map((account) => account.id);
      const unchanged =
        ids.length === current.length &&
        ids.every((id, index) => id === current[index]);
      if (unchanged) {
        return;
      }
      void reorderAccounts({ ids: ids as Id<"accounts">[] });
    },
    [accounts, reorderAccounts]
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1 bg-background"
      contentContainerClassName="items-center px-5"
      contentInsetAdjustmentBehavior="automatic"
      scrollEnabled={!isReorderingAccounts}
      contentContainerStyle={{
        paddingBottom: insets.bottom + BottomTabInset + 24,
      }}
    >
      <View className="w-full gap-6" style={{ maxWidth: MaxContentWidth }}>
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <ThemedText type="smallBold" color="muted" className="text-[15px]">
              Balance
            </ThemedText>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: isBalanceVisible }}
              accessibilityLabel={
                isBalanceVisible ? "Hide balances" : "Show balances"
              }
              hitSlop={8}
              onPress={toggleBalanceVisibility}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: colors.card,
                borderRadius: 17,
                height: 34,
                justifyContent: "center",
                opacity: pressed ? 0.65 : 1,
                width: 34,
              })}
            >
              <SymbolView
                name={(isBalanceVisible ? "eye" : "eye.slash") as never}
                size={18}
                tintColor={colors.muted}
              />
            </Pressable>
          </View>
          {isLoading ? (
            <View style={{ gap: 9 }}>
              <SkeletonBlock height={38} width={180} borderRadius={12} />
              <View style={{ flexDirection: "row", gap: 16 }}>
                <SkeletonBlock height={13} width={112} />
                <SkeletonBlock height={13} width={112} />
              </View>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginLeft: -HORIZONTAL_PADDING, width: carouselWidth }}
              contentContainerStyle={{
                gap: 32,
                paddingLeft: HORIZONTAL_PADDING,
                paddingRight: HORIZONTAL_PADDING,
              }}
            >
              {balanceByCurrency.map((item) => (
                <CurrencyBalanceCard
                  key={item.currency}
                  item={item}
                  isBalanceVisible={isBalanceVisible}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View className="gap-2">
          <ThemedText type="subtitle" className="text-[22px] leading-7">
            Accounts
          </ThemedText>
          {isLoading ? (
            <AccountGridSkeleton cardWidth={cardWidth} />
          ) : (
            <AccountGrid
              accounts={accounts}
              carouselWidth={carouselWidth}
              horizontalPadding={HORIZONTAL_PADDING}
              layout={accountGridLayout}
              onDraggingChange={setIsReorderingAccounts}
              onPressAccount={handlePressAccount}
              onReorder={handleReorderAccounts}
              renderAccount={(account) => (
                <AccountCard
                  account={account}
                  isBalanceVisible={isBalanceVisible}
                />
              )}
              renderAddAccount={() => <AddAccountCard width={cardWidth} />}
            />
          )}
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <ThemedText type="subtitle" className="text-[22px] leading-7">
              Recent transactions
            </ThemedText>
            {!isLoading ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  router.push("/transactions");
                }}
              >
                <ThemedText
                  type="linkPrimary"
                  className="text-[15px] font-semibold"
                >
                  View more
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
          {isLoading ? (
            <ListSkeleton />
          ) : (
            <TransactionList transactions={transactions} />
          )}
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <ThemedText type="subtitle" className="text-[22px] leading-7">
              Budgets
            </ThemedText>
            {!isLoading ? (
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  router.push("/budgets");
                }}
              >
                <ThemedText
                  type="linkPrimary"
                  className="text-[15px] font-semibold"
                >
                  View more
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
          {isLoading ? (
            <ListSkeleton rows={2} />
          ) : (
            <BudgetList
              budgets={[...budgets].sort(
                (a, b) => b.spent / (b.limit || 1) - a.spent / (a.limit || 1)
              )}
              onPressBudget={(budget) => {
                router.push({
                  params: { id: budget.id },
                  pathname: "/budget/[id]",
                });
              }}
            />
          )}
        </View>
      </View>
    </ScrollView>
  );
}
