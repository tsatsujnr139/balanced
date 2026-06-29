import { router } from "expo-router";
import { ScrollView, Switch, Text, TextInput, View } from "react-native";

import { useAddBudget } from "@/features/finance/add-budget-context";
import { BUDGET_PERIOD_LABEL } from "@/features/finance/budget-constants";
import {
  FieldGroup,
  FieldRow,
  FieldSectionLabel,
} from "@/features/finance/components/form-fields";
import {
  CategoryLeading,
  ColorLeading,
} from "@/features/finance/components/label-form-leads";
import { DEFAULT_CURRENCY, getCurrencySymbol } from "@/features/finance/format";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

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

export default function AddBudgetScreen() {
  const colors = useThemeColors();
  const { accounts } = useFinance();
  const {
    amount,
    category,
    name,
    notifyAtThreshold,
    notifyOnOverspend,
    period,
    setAmount,
    setName,
    setNotifyAtThreshold,
    setNotifyOnOverspend,
    tag,
  } = useAddBudget();
  const currencySymbol = getCurrencySymbol(
    accounts[0]?.currency ?? DEFAULT_CURRENCY
  );

  return (
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
          <Text
            style={{
              color: colors.foreground,
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
              color: colors.foreground,
              flex: 1,
              fontSize: 52,
              fontWeight: "700",
              minHeight: 74,
              textAlign: "right",
            }}
            value={amount}
          />
        </View>
        <View
          style={{
            alignItems: "center",
            borderTopColor: colors.border,
            borderTopWidth: 1,
            flexDirection: "row",
            minHeight: 62,
            paddingHorizontal: 18,
          }}
        >
          <TextInput
            onChangeText={setName}
            placeholder="Budget name"
            placeholderTextColor={colors.muted}
            style={{
              color: colors.foreground,
              flex: 1,
              fontSize: 17,
              minHeight: 62,
            }}
            value={name}
          />
        </View>
      </FieldGroup>

      <FieldGroup>
        <FieldRow
          label="Category"
          leading={
            <CategoryLeading
              color={category?.color ?? "#8E8E93"}
              symbol={category?.symbol ?? "square.grid.2x2.fill"}
            />
          }
          onPress={() => router.push("/add-budget/category")}
          valueNode={
            category ? (
              <Text style={{ color: colors.muted, fontSize: 17 }}>
                {category.name}
              </Text>
            ) : (
              <Text style={{ color: colors.negative, fontSize: 17 }}>
                Required
              </Text>
            )
          }
        />
        <FieldRow
          label="Period"
          icon="arrow.triangle.2.circlepath"
          iconColor="#0A84FF"
          onPress={() => router.push("/add-budget/period")}
          value={BUDGET_PERIOD_LABEL[period]}
        />
        <FieldRow
          label="Tag"
          last
          leading={<ColorLeading color={tag?.color ?? colors.border} />}
          onPress={() => router.push("/add-budget/tags")}
          value={tag?.name ?? "None"}
        />
      </FieldGroup>

      <View>
        <FieldSectionLabel>In-app notifications</FieldSectionLabel>
        <FieldGroup>
          <SwitchRow
            description="Alert me when this budget is exceeded"
            label="Budget overspend"
            onValueChange={setNotifyOnOverspend}
            value={notifyOnOverspend}
          />
          <SwitchRow
            description="Alert me when 75% of the budget is spent"
            label="75% of budget spent"
            last
            onValueChange={setNotifyAtThreshold}
            value={notifyAtThreshold}
          />
        </FieldGroup>
      </View>
    </ScrollView>
  );
}
