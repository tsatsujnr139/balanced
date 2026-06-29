import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { cn } from "@/lib/cn";

import {
  formatCurrency,
  formatShortDate,
  plannedPaymentScheduleLabel,
} from "../format";
import {
  PLANNED_OVERDUE_COLOR,
  PLANNED_TODAY_COLOR,
} from "../planned-payment-constants";
import type { PlannedPayment } from "../types";

interface Props {
  plannedPayments: PlannedPayment[];
}

function dueLabelColor(payment: PlannedPayment): "muted" | undefined {
  return payment.dueStatus === "overdue" || payment.dueStatus === "today"
    ? undefined
    : "muted";
}

function OverdueBadge({ count }: { count: number }) {
  return (
    <View
      className="min-w-5 items-center justify-center rounded-full px-1.5"
      style={{ backgroundColor: PLANNED_OVERDUE_COLOR, height: 20 }}
    >
      <ThemedText type="smallBold" style={{ color: "#fff", fontSize: 12 }}>
        {count > 99 ? "99+" : count}
      </ThemedText>
    </View>
  );
}

function PlannedPaymentRow({ payment }: { payment: PlannedPayment }) {
  const amountColor = payment.type === "income" ? "positive" : "negative";
  const dueColor =
    payment.dueStatus === "overdue"
      ? PLANNED_OVERDUE_COLOR
      : payment.dueStatus === "today"
        ? PLANNED_TODAY_COLOR
        : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-start gap-2.5"
      onPress={() => {
        router.push({
          params: { id: payment.id },
          pathname: "/planned-payment/[id]",
        });
      }}
    >
      <View
        className="size-[42px] shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: payment.color }}
      >
        <SymbolView name={payment.symbol as never} size={18} tintColor="#fff" />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <ThemedText
          type="smallBold"
          numberOfLines={1}
          className="text-base leading-[22px]"
        >
          {payment.name}
        </ThemedText>
        <ThemedText
          type="small"
          color="muted"
          numberOfLines={1}
          className="text-[15px] leading-[21px]"
        >
          {payment.category}
        </ThemedText>
        <ThemedText
          type="small"
          color="muted"
          numberOfLines={1}
          className="text-[15px] italic leading-[21px]"
        >
          {plannedPaymentScheduleLabel(payment.frequency, payment.interval)}
        </ThemedText>
        <ThemedText
          type="small"
          color="muted"
          numberOfLines={1}
          className="text-[15px] leading-[21px]"
        >
          {payment.accountName}
        </ThemedText>
      </View>
      <View className="shrink-0 items-end gap-1">
        {payment.overdueCount > 0 ? (
          <OverdueBadge count={payment.overdueCount} />
        ) : null}
        <ThemedText
          type="smallBold"
          color={amountColor}
          className="text-base leading-[22px]"
        >
          {formatCurrency(
            payment.type === "income" ? payment.amount : -payment.amount,
            payment.currency,
            { signed: true }
          )}
        </ThemedText>
        <ThemedText
          type="small"
          color={dueLabelColor(payment)}
          numberOfLines={1}
          style={dueColor ? { color: dueColor } : undefined}
          className="text-[13px] font-semibold leading-[18px]"
        >
          {payment.nextDueDate ? formatShortDate(payment.nextDueDate) : "Completed"}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export function PlannedPaymentList({ plannedPayments }: Props) {
  if (plannedPayments.length === 0) {
    return (
      <ThemedView
        variant="card"
        className="items-center rounded-[22px] px-4 py-7"
      >
        <View className="mb-3 size-11 items-center justify-center rounded-full bg-background">
          <SymbolView name="clock.badge" size={22} tintColor="#8E8E93" />
        </View>
        <ThemedText type="small" color="muted" className="text-center">
          No planned payments yet
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="card" className="rounded-[22px] p-4">
      {plannedPayments.map((payment, index) => (
        <View
          key={payment.id}
          className={cn(index < plannedPayments.length - 1 && "mb-4")}
        >
          <PlannedPaymentRow payment={payment} />
        </View>
      ))}
    </ThemedView>
  );
}
