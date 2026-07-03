import { usePaginatedQuery } from "convex/react";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { TransactionList } from "@/features/finance/components/transaction-list";
import { formatCurrency } from "@/features/finance/format";
import {
  maskCurrencyValue,
  useBalanceVisibility,
} from "@/features/finance/use-balance-visibility";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

const ADD_BUTTON_SIZE = 64;
const ADD_BUTTON_RADIUS = ADD_BUTTON_SIZE / 2;
const ADD_BUTTON_ICON_SIZE = 29;

function canUseLiquidGlass() {
  try {
    return isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

export default function AccountScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const hasLiquidGlass = canUseLiquidGlass();
  const { id } = useLocalSearchParams<{ id: string }>();
  const accountId = Array.isArray(id) ? id[0] : id;
  const { accounts, isLoading: isLoadingAccounts } = useFinance();
  const { isBalanceVisible, toggleBalanceVisibility } = useBalanceVisibility();
  const account = accounts.find((item) => item.id === accountId);
  const accountBalance = account
    ? formatCurrency(account.balance, account.currency)
    : "";
  const {
    results: transactions,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.finance.listAccountTransactions,
    accountId ? { accountId: accountId as Id<"accounts"> } : "skip",
    { initialNumItems: 10 }
  );

  return (
    <>
      <View style={{ backgroundColor: colors.background, flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            gap: 24,
            paddingBottom: insets.bottom + 96,
            paddingHorizontal: 20,
          }}
          style={{ flex: 1 }}
        >
          {isLoadingAccounts || !account ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                minHeight: 180,
              }}
            >
              {isLoadingAccounts ? (
                <ActivityIndicator />
              ) : (
                <Text style={{ color: colors.muted, fontSize: 17 }}>
                  Account not found
                </Text>
              )}
            </View>
          ) : (
            <>
              <View
                style={{
                  backgroundColor: colors.card,
                  borderCurve: "continuous",
                  borderRadius: 24,
                  padding: 20,
                }}
              >
                <View style={{ gap: 4 }}>
                  <View
                    style={{
                      alignItems: "center",
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 14 }}>
                      Account balance
                    </Text>
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
                        backgroundColor: colors.background,
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
                  <Text
                    style={{
                      color:
                        account.balance < 0
                          ? colors.negative
                          : colors.foreground,
                      fontSize: 36,
                      fontVariant: ["tabular-nums"],
                      fontWeight: "700",
                    }}
                  >
                    {isBalanceVisible
                      ? accountBalance
                      : maskCurrencyValue(accountBalance)}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: 22,
                    fontWeight: "700",
                  }}
                >
                  Transactions
                </Text>
                {status === "LoadingFirstPage" ? (
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 96,
                    }}
                  >
                    <ActivityIndicator />
                  </View>
                ) : (
                  <TransactionList transactions={transactions} />
                )}
                {status === "CanLoadMore" || status === "LoadingMore" ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={status === "LoadingMore"}
                    onPress={() => {
                      loadMore(10);
                    }}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: 44,
                      opacity: pressed || status === "LoadingMore" ? 0.6 : 1,
                    })}
                  >
                    {status === "LoadingMore" ? (
                      <ActivityIndicator />
                    ) : (
                      <Text
                        style={{
                          color: colors.primary,
                          fontSize: 17,
                          fontWeight: "600",
                        }}
                      >
                        Show more
                      </Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
            </>
          )}
        </ScrollView>

        {accountId && account ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add transaction"
            onPress={() => {
              router.push({
                params: { accountId },
                pathname: "/add-transaction",
              });
            }}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: hasLiquidGlass ? "transparent" : colors.card,
              borderRadius: ADD_BUTTON_RADIUS,
              bottom: Math.max(insets.bottom - 6, 6),
              elevation: 8,
              height: ADD_BUTTON_SIZE,
              justifyContent: "center",
              overflow: "hidden",
              position: "absolute",
              right: 20,
              shadowColor: colors.foreground,
              shadowOffset: { height: 8, width: 0 },
              shadowOpacity: 0.18,
              shadowRadius: 18,
              transform: [{ scale: pressed ? 0.96 : 1 }],
              width: ADD_BUTTON_SIZE,
            })}
          >
            {hasLiquidGlass ? (
              <>
                <GlassView
                  glassEffectStyle="regular"
                  isInteractive
                  style={{
                    borderRadius: ADD_BUTTON_RADIUS,
                    height: ADD_BUTTON_SIZE,
                    width: ADD_BUTTON_SIZE,
                  }}
                />
                <View
                  pointerEvents="none"
                  style={{
                    alignItems: "center",
                    bottom: 0,
                    justifyContent: "center",
                    left: 0,
                    position: "absolute",
                    right: 0,
                    top: 0,
                  }}
                >
                  <SymbolView
                    name="plus"
                    size={ADD_BUTTON_ICON_SIZE}
                    tintColor={colors.foreground}
                  />
                </View>
              </>
            ) : (
              <SymbolView
                name="plus"
                size={ADD_BUTTON_ICON_SIZE}
                tintColor={colors.foreground}
              />
            )}
          </Pressable>
        ) : null}
      </View>

      <Stack.Screen.Title>{account?.name ?? "Account"}</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Edit account"
          disabled={!accountId}
          onPress={() => {
            if (!accountId) {
              return;
            }

            router.push({
              params: { id: accountId },
              pathname: "/add-account",
            });
          }}
        >
          Edit
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
