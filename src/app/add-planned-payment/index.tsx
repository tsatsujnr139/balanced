import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { DatePicker, Host } from "@expo/ui/swift-ui";
import {
  datePickerStyle,
  environment,
  tint,
} from "@expo/ui/swift-ui/modifiers";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

import { Icon as SymbolView } from "@/components/icon";
import { useAddPlannedPayment } from "@/features/finance/add-planned-payment-context";
import {
  FieldGroup,
  FieldRow,
  FieldSectionLabel,
} from "@/features/finance/components/form-fields";
import { getCurrencySymbol } from "@/features/finance/format";
import {
  PLANNED_PAYMENT_FREQUENCIES,
  PLANNED_PAYMENT_FREQUENCY_LABEL,
} from "@/features/finance/planned-payment-constants";
import { TRANSACTION_CATEGORIES } from "@/features/finance/transaction-categories";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

const PLANNED_PAYMENT_TYPES = ["Expense", "Income", "Transfer"];

const TRANSACTION_CHARGE_CATEGORY = TRANSACTION_CATEGORIES.find(
  (item) => item.name === "Transaction charges"
);

function formatDateOnly(date: number): string {
  return new Intl.DateTimeFormat("en-GH", { dateStyle: "medium" }).format(
    new Date(date)
  );
}

function mergeDatePart(current: number, selectedDate: Date): number {
  const next = new Date(current);
  next.setFullYear(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  );
  return next.getTime();
}

function tagsLabel(tags: { name: string }[]): string {
  if (tags.length === 0) {
    return "None";
  }
  if (tags.length === 1) {
    return tags[0].name;
  }
  return `${tags.length} tags`;
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
        displayedComponents={["date"]}
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

function DueDateRow({
  date,
  setDate,
}: {
  date: number;
  setDate: (date: number) => void;
}) {
  const colors = useThemeColors();
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
          backgroundColor: "#5856D6",
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
          First due
        </Text>
        {Platform.OS === "ios" ? (
          <IOSCompactDatePicker
            date={date}
            onDateChange={(selectedDate) => {
              setDate(mergeDatePart(date, selectedDate));
            }}
          />
        ) : (
          <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setActivePicker(true)}
            >
              <Text
                style={{ color: colors.primary, fontSize: 17 }}
                numberOfLines={1}
              >
                {formatDateOnly(date)}
              </Text>
            </Pressable>
            {activePicker ? (
              <DateTimePicker
                accentColor={colors.primary}
                mode="date"
                onDismiss={() => setActivePicker(false)}
                onValueChange={(_event, selectedDate) => {
                  setDate(mergeDatePart(date, selectedDate));
                  setActivePicker(false);
                }}
                presentation="dialog"
                value={new Date(date)}
              />
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  last = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last?: boolean;
}) {
  const colors = useThemeColors();

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
          borderBottomColor: colors.border,
          borderBottomWidth: last ? 0 : 1,
          flex: 1,
          flexDirection: "row",
          gap: 12,
          minHeight: 62,
          paddingRight: 16,
          paddingVertical: 12,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.foreground, fontSize: 17 }}>
            {label}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {description}
          </Text>
        </View>
        <Switch
          onValueChange={onValueChange}
          trackColor={{ true: colors.primary }}
          value={value}
        />
      </View>
    </View>
  );
}

export default function AddPlannedPaymentScreen() {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const { accounts } = useFinance();
  const {
    accountId,
    amount,
    canDelete,
    category,
    confirmDelete,
    date,
    description,
    frequency,
    interval,
    isDeleting,
    name,
    notifyOnDue,
    notifyOnOverdue,
    setAmount,
    setDate,
    setDescription,
    setFrequency,
    setInterval,
    setName,
    setNotifyOnDue,
    setNotifyOnOverdue,
    setTransactionCharge,
    setType,
    tags,
    toAccountId,
    transactionCharge,
    type,
  } = useAddPlannedPayment();
  const account = accounts.find((item) => item.id === accountId);
  const toAccount = accounts.find((item) => item.id === toAccountId);
  const currencySymbol = getCurrencySymbol(
    account?.currency ?? accounts[0]?.currency ?? "GHS"
  );
  const amountColor =
    type === "income"
      ? colors.positive
      : type === "expense"
        ? colors.negative
        : colors.foreground;
  const typeIndex = type === "income" ? 1 : type === "transfer" ? 2 : 0;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 18,
        paddingBottom: 220,
        paddingHorizontal: 20,
      }}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <SegmentedControl
        appearance={colorScheme === "dark" ? "dark" : "light"}
        onChange={(event) => {
          const selected = event.nativeEvent.selectedSegmentIndex;
          setType(
            selected === 1 ? "income" : selected === 2 ? "transfer" : "expense"
          );
        }}
        selectedIndex={typeIndex}
        style={{ width: "100%" }}
        values={PLANNED_PAYMENT_TYPES}
      />
      <FieldGroup>
        <View
          style={{
            alignItems: "baseline",
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 18,
            paddingVertical: 18,
          }}
        >
          <Text style={{ color: amountColor, fontSize: 34, fontWeight: "700" }}>
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
        {type === "expense" || type === "transfer" ? (
          <View
            style={{
              alignItems: "center",
              borderTopColor: colors.border,
              borderTopWidth: 1,
              flexDirection: "row",
              gap: 12,
              minHeight: 62,
              paddingHorizontal: 18,
            }}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor:
                  TRANSACTION_CHARGE_CATEGORY?.color ?? "#8E8E93",
                borderRadius: 9,
                height: 30,
                justifyContent: "center",
                width: 30,
              }}
            >
              <SymbolView
                name={
                  (TRANSACTION_CHARGE_CATEGORY?.symbol ??
                    "creditcard.fill") as never
                }
                size={16}
                tintColor="#fff"
              />
            </View>
            <Text
              selectable
              style={{
                color: colors.foreground,
                fontSize: 14,
                fontStyle: "italic",
                fontWeight: "500",
              }}
            >
              Transaction charge
            </Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setTransactionCharge}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              style={{
                color: colors.foreground,
                flex: 1,
                fontSize: 18,
                fontStyle: "italic",
                minHeight: 62,
                textAlign: "right",
              }}
              value={transactionCharge}
            />
          </View>
        ) : null}
        <View
          style={{
            borderTopColor: colors.border,
            borderTopWidth: 1,
            minHeight: 62,
            paddingHorizontal: 18,
          }}
        >
          <TextInput
            onChangeText={setName}
            placeholder="Payment name"
            placeholderTextColor={colors.muted}
            style={{ color: colors.foreground, fontSize: 17, minHeight: 62 }}
            value={name}
          />
        </View>
        <View
          style={{
            borderTopColor: colors.border,
            borderTopWidth: 1,
            minHeight: 62,
            paddingHorizontal: 18,
          }}
        >
          <TextInput
            multiline
            onChangeText={setDescription}
            placeholder="Transaction description"
            placeholderTextColor={colors.muted}
            style={{
              color: colors.foreground,
              fontSize: 17,
              minHeight: 62,
              paddingVertical: 18,
            }}
            value={description}
          />
        </View>
      </FieldGroup>

      <View>
        <FieldSectionLabel>General</FieldSectionLabel>
        <FieldGroup>
          <FieldRow
            icon="creditcard.fill"
            iconColor={account?.color ?? "#8E8E93"}
            label={type === "transfer" ? "From Account" : "Account"}
            onPress={() =>
              router.push({
                params: { field: type === "transfer" ? "from" : "account" },
                pathname: "/add-planned-payment/account",
              })
            }
            valueNode={
              <Text
                style={{
                  color: account ? colors.muted : colors.negative,
                  fontSize: 17,
                }}
              >
                {account?.name ?? "Required"}
              </Text>
            }
          />
          {type === "transfer" ? (
            <FieldRow
              icon={toAccount?.symbol ?? "tray.full.fill"}
              iconColor={toAccount?.color ?? "#8E8E93"}
              label="To Account"
              onPress={() =>
                router.push({
                  params: { field: "to" },
                  pathname: "/add-planned-payment/account",
                })
              }
              valueNode={
                <Text
                  style={{
                    color: toAccount ? colors.muted : colors.negative,
                    fontSize: 17,
                  }}
                >
                  {toAccount?.name ?? "Required"}
                </Text>
              }
            />
          ) : (
            <FieldRow
              icon={category?.symbol ?? "square.grid.2x2.fill"}
              iconColor={category?.color ?? "#8E8E93"}
              label="Category"
              onPress={() => router.push("/add-planned-payment/category")}
              valueNode={
                <Text
                  style={{
                    color: category ? colors.muted : colors.negative,
                    fontSize: 17,
                  }}
                >
                  {category?.name ?? "Required"}
                </Text>
              }
            />
          )}
          <FieldRow
            icon="tag"
            iconColor="#5856D6"
            label="Tags"
            last
            onPress={() => router.push("/add-planned-payment/tags")}
            value={tagsLabel(tags)}
          />
        </FieldGroup>
      </View>

      <View>
        <FieldSectionLabel>Date and repeat</FieldSectionLabel>
        <FieldGroup>
          <DueDateRow date={date} setDate={setDate} />
          <FieldRow
            icon="arrow.triangle.2.circlepath"
            iconColor="#30B05A"
            label="Repeats"
            onPress={() => {
              const currentIndex =
                PLANNED_PAYMENT_FREQUENCIES.indexOf(frequency);
              const next =
                PLANNED_PAYMENT_FREQUENCIES[
                  (currentIndex + 1) % PLANNED_PAYMENT_FREQUENCIES.length
                ];
              setFrequency(next);
            }}
            value={PLANNED_PAYMENT_FREQUENCY_LABEL[frequency]}
          />
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
              <SymbolView name="number" size={17} tintColor="#fff" />
            </View>
            <View
              style={{
                alignItems: "center",
                flex: 1,
                flexDirection: "row",
                minHeight: 62,
                paddingRight: 16,
              }}
            >
              <Text style={{ color: colors.foreground, flex: 1, fontSize: 17 }}>
                Every
              </Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) =>
                  setInterval(Number.parseInt(value, 10) || 1)
                }
                placeholder="1"
                placeholderTextColor={colors.muted}
                style={{
                  color: colors.foreground,
                  fontSize: 17,
                  minWidth: 56,
                  textAlign: "right",
                }}
                value={String(interval)}
              />
            </View>
          </View>
        </FieldGroup>
      </View>

      <View>
        <FieldSectionLabel>In-app notifications</FieldSectionLabel>
        <FieldGroup>
          <SwitchRow
            description="Alert me when this payment is due"
            label="Due today"
            onValueChange={setNotifyOnDue}
            value={notifyOnDue}
          />
          <SwitchRow
            description="Alert me when this payment is overdue"
            label="Overdue"
            last
            onValueChange={setNotifyOnOverdue}
            value={notifyOnOverdue}
          />
        </FieldGroup>
      </View>

      {canDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete planned payment"
          disabled={isDeleting}
          onPress={confirmDelete}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: "transparent",
            borderCurve: "continuous",
            borderRadius: 18,
            justifyContent: "center",
            minHeight: 56,
            opacity: pressed || isDeleting ? 0.6 : 1,
          })}
        >
          {isDeleting ? (
            <ActivityIndicator color={colors.negative} />
          ) : (
            <View
              style={{ alignItems: "center", flexDirection: "row", gap: 8 }}
            >
              <SymbolView name="trash" size={18} tintColor={colors.negative} />
              <Text
                style={{
                  color: colors.negative,
                  fontSize: 17,
                  fontWeight: "600",
                }}
              >
                Delete
              </Text>
            </View>
          )}
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
