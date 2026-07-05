import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { DatePicker, Host } from "@expo/ui/swift-ui";
import {
  datePickerStyle,
  environment,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

import { Icon as SymbolView } from "@/components/icon";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  FieldGroup,
  FieldRow,
  FieldSectionLabel,
} from "@/features/finance/components/form-fields";
import { getCurrencySymbol } from "@/features/finance/format";
import { usePlannedPaymentSummary } from "@/features/finance/planned-payment-summary-context";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(date: number): string {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function IOSCompactDatePicker({
  date,
  onDateChange,
}: {
  date: number;
  onDateChange: (selectedDate: Date) => void;
}) {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();

  return (
    <Host matchContents ignoreSafeArea="all" style={{ flexShrink: 0 }}>
      <DatePicker
        displayedComponents={["date", "hourAndMinute"]}
        modifiers={[
          datePickerStyle("compact"),
          tint(colors.primary),
          environment("colorScheme", colorScheme === "dark" ? "dark" : "light"),
        ]}
        onDateChange={onDateChange}
        selection={new Date(date)}
      />
    </Host>
  );
}

function PaymentDateRow() {
  const colors = useThemeColors();
  const { paymentDate, setPaymentDate } = usePlannedPaymentSummary();
  const [activePicker, setActivePicker] = useState(false);

  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: 14,
        minHeight: 62,
        paddingLeft: 16,
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: "#8E8E93",
          borderRadius: 10,
          height: 34,
          justifyContent: "center",
          width: 34,
        }}
      >
        <SymbolView name="calendar" size={17} tintColor="#fff" />
      </View>
      <View
        style={{
          alignItems: "center",
          borderBottomColor: colors.border,
          borderBottomWidth: 1,
          flex: 1,
          flexDirection: "row",
          gap: 12,
          minHeight: 62,
          paddingRight: 16,
        }}
      >
        <Text style={{ color: colors.foreground, flex: 1, fontSize: 17 }}>
          Payment date
        </Text>
        {Platform.OS === "ios" ? (
          <IOSCompactDatePicker
            date={paymentDate}
            onDateChange={(selectedDate) => {
              setPaymentDate(selectedDate.getTime());
            }}
          />
        ) : (
          <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setActivePicker(true)}
            >
              <Text
                numberOfLines={1}
                style={{ color: colors.primary, fontSize: 17 }}
              >
                {formatDateTime(paymentDate)}
              </Text>
            </Pressable>
            {activePicker ? (
              <DateTimePicker
                accentColor={colors.primary}
                mode="datetime"
                onDismiss={() => setActivePicker(false)}
                onValueChange={(_event, selectedDate) => {
                  setPaymentDate(selectedDate.getTime());
                  setActivePicker(false);
                }}
                presentation="dialog"
                value={new Date(paymentDate)}
              />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

export default function PlannedPaymentSummaryScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();
  const id = firstParam(params.id);
  const planned = useQuery(
    api.finance.getPlannedPayment,
    id ? { id: id as Id<"plannedPayments"> } : "skip"
  );
  const { accounts } = useFinance();
  const { accountId, amount, setAmount } = usePlannedPaymentSummary();
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const currency = selectedAccount?.currency ?? planned?.currency ?? "GHS";
  const currencySymbol = getCurrencySymbol(currency);
  const amountColor =
    planned?.type === "income" ? colors.positive : colors.negative;

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
        <Text style={{ color: colors.muted, fontSize: 15 }}>
          This payment could not be loaded.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 24, paddingBottom: 40 }}
      keyboardDismissMode="interactive"
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <View style={{ paddingHorizontal: 20 }}>
        <View
          style={{
            alignItems: "baseline",
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 12,
            paddingVertical: 24,
          }}
        >
          <Text
            style={{
              color: amountColor,
              fontSize: 34,
              fontWeight: "700",
            }}
          >
            {currencySymbol}
          </Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setAmount}
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            style={{
              color: amountColor,
              flex: 1,
              fontSize: 52,
              fontWeight: "700",
              minHeight: 74,
              textAlign: "right",
            }}
            value={amount}
          />
        </View>
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <FieldSectionLabel>General</FieldSectionLabel>
        <FieldGroup>
          <PaymentDateRow />
          <FieldRow
            icon={selectedAccount?.symbol ?? "banknote.fill"}
            iconColor={selectedAccount?.color ?? planned.color}
            label="Account"
            last
            value={selectedAccount?.name ?? "Choose account"}
            onPress={() => router.push("/planned-payment-summary/account")}
          />
        </FieldGroup>
      </View>
    </ScrollView>
  );
}
