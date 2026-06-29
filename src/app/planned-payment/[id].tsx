import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { FieldSectionLabel } from "@/features/finance/components/form-fields";
import {
  formatCurrency,
  formatPlannedDate,
  formatTransactionDate,
  plannedOccurrenceDueLabel,
} from "@/features/finance/format";
import {
  PLANNED_OVERDUE_COLOR,
  PLANNED_TODAY_COLOR,
} from "@/features/finance/planned-payment-constants";
import type { PlannedPaymentOccurrence } from "@/features/finance/types";
import { useLocalProfile } from "@/features/finance/use-local-profile";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function dueStatusColor(
  daysUntilDue: number,
  colors: ReturnType<typeof useThemeColors>
): string {
  if (daysUntilDue < 0) {
    return PLANNED_OVERDUE_COLOR;
  }
  if (daysUntilDue === 0) {
    return PLANNED_TODAY_COLOR;
  }
  return colors.primary;
}

function PendingOccurrence({
  occurrence,
  isBusy,
  onMarkPaid,
  onEdit,
}: {
  occurrence: PlannedPaymentOccurrence;
  isBusy: boolean;
  onMarkPaid: () => void;
  onEdit: () => void;
}) {
  const colors = useThemeColors();
  const accent = dueStatusColor(occurrence.daysUntilDue, colors);

  return (
    <View className="gap-3">
      <View className="gap-1.5">
        <ThemedText type="smallBold" className="text-[20px] leading-7">
          {formatPlannedDate(occurrence.dueDate)}
        </ThemedText>
        <View className="flex-row items-center gap-2">
          <SymbolView
            name={
              occurrence.daysUntilDue < 0
                ? "clock.badge.exclamationmark"
                : "clock"
            }
            size={16}
            tintColor={accent}
          />
          <Text style={{ color: accent, fontSize: 15, fontWeight: "600" }}>
            {plannedOccurrenceDueLabel(occurrence.daysUntilDue)}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={onMarkPaid}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: colors.primary,
            borderCurve: "continuous",
            borderRadius: 12,
            flex: 1,
            justifyContent: "center",
            minHeight: 44,
            opacity: pressed || isBusy ? 0.6 : 1,
          })}
        >
          {isBusy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
              Mark as paid
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={onEdit}
          style={({ pressed }) => ({
            alignItems: "center",
            borderColor: colors.primary,
            borderCurve: "continuous",
            borderRadius: 12,
            borderWidth: 1,
            flex: 1,
            justifyContent: "center",
            minHeight: 44,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{ color: colors.primary, fontSize: 15, fontWeight: "600" }}
          >
            Edit
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ResolvedOccurrence({
  occurrence,
  currency,
}: {
  occurrence: PlannedPaymentOccurrence;
  currency: string;
}) {
  const colors = useThemeColors();
  const isPaid = occurrence.status === "paid";

  return (
    <View className="gap-1.5">
      <ThemedText
        type="smallBold"
        color="muted"
        className="text-[20px] leading-7"
      >
        {formatPlannedDate(occurrence.dueDate)}
      </ThemedText>
      <View className="flex-row items-center gap-2">
        <SymbolView
          name={isPaid ? "checkmark.circle.fill" : "trash.fill"}
          size={16}
          tintColor={isPaid ? colors.muted : PLANNED_OVERDUE_COLOR}
        />
        <Text style={{ color: colors.muted, flex: 1, fontSize: 15 }}>
          {isPaid
            ? `Paid ${occurrence.paidDate ? formatTransactionDate(occurrence.paidDate) : ""}`.trim()
            : "Deleted"}
        </Text>
        {isPaid ? (
          <ThemedText type="small" color="muted" className="text-[15px]">
            {formatCurrency(occurrence.amount, currency, { signed: true })}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

export default function PlannedPaymentDetailScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = firstParam(params.id);
  const planned = useQuery(
    api.finance.getPlannedPayment,
    id ? { id: id as Id<"plannedPayments"> } : "skip"
  );
  const markPaid = useMutation(api.finance.markPlannedPaymentPaid);
  const { firstName } = useLocalProfile();
  const [busyDueDate, setBusyDueDate] = useState<string | null>(null);

  const openEditor = () => {
    if (!id) {
      return;
    }
    router.push({ params: { id }, pathname: "/add-planned-payment" });
  };

  const handleMarkPaid = async (occurrence: PlannedPaymentOccurrence) => {
    if (!id || busyDueDate) {
      return;
    }
    setBusyDueDate(occurrence.dueDate);
    try {
      await markPaid({
        createdByName: firstName,
        dueDate: new Date(occurrence.dueDate).getTime(),
        id: id as Id<"plannedPayments">,
      });
    } catch (error) {
      Alert.alert(
        "Could not mark as paid",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setBusyDueDate(null);
    }
  };

  if (planned === undefined) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.background,
          flex: 1,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (planned === null) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.background,
          flex: 1,
          justifyContent: "center",
        }}
      >
        <Stack.Screen.BackButton displayMode="minimal" />
        <ThemedText type="small" color="muted">
          This planned payment was not found.
        </ThemedText>
      </View>
    );
  }

  const signedAmount =
    planned.type === "income" ? planned.amount : -planned.amount;

  return (
    <>
      <Stack.Screen.BackButton displayMode="minimal" />
      <Stack.Screen.Title>{planned.name}</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Edit planned payment"
          icon="pencil"
          onPress={openEditor}
        />
      </Stack.Toolbar>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          gap: 18,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <View className="items-center gap-2 pt-2">
          <View
            className="size-[72px] items-center justify-center rounded-full"
            style={{ backgroundColor: planned.color }}
          >
            <SymbolView
              name={planned.symbol as never}
              size={34}
              tintColor="#fff"
            />
          </View>
          <ThemedText
            type="subtitle"
            className="mt-1 text-center text-[22px] leading-7"
          >
            {planned.name}
          </ThemedText>
          {planned.description ? (
            <ThemedText type="small" color="muted" className="text-center">
              {planned.description}
            </ThemedText>
          ) : null}
          <ThemedText type="smallBold" color="muted" className="text-[17px]">
            {formatCurrency(signedAmount, planned.currency, { signed: true })}
          </ThemedText>
        </View>

        <View>
          <FieldSectionLabel>Payment overview</FieldSectionLabel>
          <ThemedView variant="card" className="rounded-[22px] p-4">
            {planned.occurrences.map((occurrence, index) => (
              <View key={occurrence.dueDate}>
                {occurrence.status === "pending" ? (
                  <PendingOccurrence
                    isBusy={busyDueDate === occurrence.dueDate}
                    occurrence={occurrence}
                    onEdit={openEditor}
                    onMarkPaid={() => {
                      void handleMarkPaid(occurrence);
                    }}
                  />
                ) : (
                  <ResolvedOccurrence
                    currency={planned.currency}
                    occurrence={occurrence}
                  />
                )}
                {index < planned.occurrences.length - 1 ? (
                  <View
                    className="my-4 h-px"
                    style={{ backgroundColor: colors.border }}
                  />
                ) : null}
              </View>
            ))}
          </ThemedView>
        </View>
      </ScrollView>
    </>
  );
}
