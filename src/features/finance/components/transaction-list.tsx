import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { cn } from "@/lib/cn";

import { setTransactionEditPrefill } from "../edit-transaction-prefill";
import {
  formatCurrency,
  formatTransactionSectionDate,
  getTransactionDayKey,
} from "../format";
import type { Transaction } from "../types";

interface Props {
  transactions: Transaction[];
}

interface TransactionSection {
  key: string;
  title: string;
  transactions: Transaction[];
}

function openTransactionEditor(transaction: Transaction) {
  if (transaction.parentTransactionId) {
    router.push({
      params: { transactionId: transaction.parentTransactionId },
      pathname: "/add-transaction",
    });
    return;
  }

  setTransactionEditPrefill(transaction);
  router.push({
    params: { transactionId: transaction.id },
    pathname: "/add-transaction",
  });
}

function isChargeRow(transaction: Transaction): boolean {
  return (
    transaction.transactionKind === "charge" ||
    transaction.category === "Transaction charges"
  );
}

function groupTransactionsByDay(
  transactions: Transaction[]
): TransactionSection[] {
  const groups = new Map<string, Transaction[]>();

  for (const transaction of transactions) {
    const key = getTransactionDayKey(transaction.date);
    const group = groups.get(key) ?? [];
    group.push(transaction);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([key, items]) => ({
      key,
      title: formatTransactionSectionDate(items[0]!.date),
      transactions: items,
    }));
}

function isTransferTransaction(transaction: Transaction): boolean {
  return (
    transaction.transactionKind === "transfer_out" ||
    transaction.transactionKind === "transfer_in" ||
    transaction.category.toLowerCase() === "transfer"
  );
}

function getTransactionAmountColor(
  transaction: Transaction
): "foreground" | "negative" | "positive" {
  if (isChargeRow(transaction) || transaction.amount < 0) {
    return "negative";
  }
  return "positive";
}

function TagBadge({ name, color }: { name: string; color: string }) {
  return (
    <View
      className="rounded-full px-2 py-0.5"
      style={{ backgroundColor: color }}
    >
      <ThemedText
        type="small"
        style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}
      >
        {name}
      </ThemedText>
    </View>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        openTransactionEditor(transaction);
      }}
      className="flex-row items-start gap-2.5"
    >
      <View
        className="size-[42px] shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: transaction.color }}
      >
        <SymbolView
          name={transaction.symbol as never}
          size={18}
          tintColor="#fff"
        />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <ThemedText
          type="smallBold"
          numberOfLines={1}
          className="text-base leading-[22px]"
        >
          {transaction.merchant}
        </ThemedText>
        <ThemedText
          type="small"
          color="muted"
          numberOfLines={1}
          className="text-[15px] leading-[21px]"
        >
          {isTransferTransaction(transaction) &&
          transaction.fromAccountName &&
          transaction.toAccountName
            ? `${transaction.fromAccountName} → ${transaction.toAccountName}`
            : transaction.accountName}
        </ThemedText>
        <ThemedText
          type="small"
          color="muted"
          numberOfLines={1}
          className="text-[15px] italic leading-[21px]"
        >
          {transaction.category}
        </ThemedText>
        {transaction.createdByName ? (
          <ThemedText
            type="small"
            color="muted"
            numberOfLines={1}
            className="text-[15px] leading-[21px]"
          >
            Created by {transaction.createdByName}
          </ThemedText>
        ) : null}
        {transaction.tags.length > 0 ? (
          <View className="mt-1 flex-row flex-wrap gap-1.5">
            {transaction.tags.map((tag) => (
              <TagBadge key={tag.id} color={tag.color} name={tag.name} />
            ))}
          </View>
        ) : null}
      </View>
      <View className="shrink-0 items-end gap-1">
        <ThemedText
          type="smallBold"
          color={getTransactionAmountColor(transaction)}
          className="text-base leading-[22px]"
        >
          {formatCurrency(transaction.amount, transaction.currency, {
            signed: true,
          })}
        </ThemedText>
        {transaction.transactionChargeAmount && !isChargeRow(transaction) ? (
          <View className="flex-row items-center gap-1">
            <SymbolView name="creditcard.fill" size={11} tintColor="#8E8E93" />
            <ThemedText
              type="small"
              color="negative"
              style={{ fontSize: 13, fontWeight: "600" }}
            >
              {formatCurrency(
                -transaction.transactionChargeAmount,
                transaction.currency,
                {
                  signed: true,
                }
              )}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function TransactionList({ transactions }: Props) {
  if (transactions.length === 0) {
    return (
      <ThemedView
        variant="card"
        className="items-center rounded-[22px] px-4 py-7"
      >
        <View className="mb-3 size-11 items-center justify-center rounded-full bg-background">
          <SymbolView name="tray" size={22} tintColor="#8E8E93" />
        </View>
        <ThemedText type="small" color="muted" className="text-center">
          No transactions found
        </ThemedText>
      </ThemedView>
    );
  }

  const sections = groupTransactionsByDay(transactions);

  return (
    <View className="gap-4">
      {sections.map((section) => (
        <ThemedView
          key={section.key}
          variant="card"
          className="rounded-[22px] p-4"
        >
          <ThemedText
            type="smallBold"
            className="mb-3 text-[15px] leading-[21px]"
          >
            {section.title}
          </ThemedText>
          {section.transactions.map((transaction, index) => (
            <View
              key={transaction.id}
              className={cn(index < section.transactions.length - 1 && "mb-4")}
            >
              <TransactionRow transaction={transaction} />
            </View>
          ))}
        </ThemedView>
      ))}
    </View>
  );
}
