import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAddBudget } from "@/features/finance/add-budget-context";
import { BUDGET_PERIOD_LABEL } from "@/features/finance/budget-constants";
import {
  FieldGroup,
  FieldRow,
  FieldSectionLabel,
} from "@/features/finance/components/form-fields";
import { CategoryLeading } from "@/features/finance/components/label-form-leads";
import { getCurrencySymbol } from "@/features/finance/format";
import { useThemeColors } from "@/hooks/use-theme";

function CurrencySymbolLeading({ currency }: { currency: string }) {
  const symbol = getCurrencySymbol(currency);

  return (
    <View
      style={{
        alignItems: "center",
        height: 34,
        justifyContent: "center",
        width: 34,
      }}
    >
      <Text
        style={{
          color: "#8E8E93",
          fontSize: symbol.length > 2 ? 11 : 18,
          fontWeight: "600",
        }}
      >
        {symbol}
      </Text>
    </View>
  );
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
  const {
    amount,
    canDelete,
    category,
    confirmDelete,
    confirmEnd,
    confirmPause,
    currency,
    isDeleting,
    isPausing,
    name,
    notifyAtThreshold,
    notifyOnOverspend,
    period,
    setAmount,
    setName,
    setNotifyAtThreshold,
    setNotifyOnOverspend,
    tags,
  } = useAddBudget();
  const currencySymbol = getCurrencySymbol(currency);

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
          label="Currency"
          leading={<CurrencySymbolLeading currency={currency} />}
          onPress={() => router.push("/add-budget/currency")}
          value={getCurrencySymbol(currency)}
        />
        <FieldRow
          icon="tag"
          iconColor="#5856D6"
          label="Tags"
          last
          onPress={() => router.push("/add-budget/tags")}
          value={tagsLabel(tags)}
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

      {canDelete ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pause or resume budget"
              disabled={isPausing}
              onPress={confirmPause}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: colors.card,
                borderColor: colors.primary,
                borderCurve: "continuous",
                borderRadius: 12,
                borderWidth: 1,
                flex: 1,
                justifyContent: "center",
                minHeight: 56,
                opacity: pressed || isPausing ? 0.6 : 1,
              })}
            >
              {isPausing ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <View
                  style={{
                    alignItems: "center",
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <SymbolView
                    name="pause.circle"
                    size={18}
                    tintColor={colors.primary}
                  />
                  <Text
                    style={{
                      color: colors.foreground,
                      fontSize: 17,
                      fontWeight: "600",
                    }}
                  >
                    Pause
                  </Text>
                </View>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="End budget"
              disabled={isPausing}
              onPress={confirmEnd}
              style={({ pressed }) => ({
                alignItems: "center",
                backgroundColor: colors.card,
                borderColor: colors.negative,
                borderCurve: "continuous",
                borderRadius: 12,
                borderWidth: 1,
                flex: 1,
                justifyContent: "center",
                minHeight: 56,
                opacity: pressed || isPausing ? 0.6 : 1,
              })}
            >
              {isPausing ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <View
                  style={{
                    alignItems: "center",
                    flexDirection: "row",
                    gap: 8,
                  }}
                >
                  <SymbolView
                    name="stop.circle"
                    size={18}
                    tintColor={colors.negative}
                  />
                  <Text
                    style={{
                      color: colors.negative,
                      fontSize: 17,
                      fontWeight: "600",
                    }}
                  >
                    End
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete budget"
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
                <SymbolView
                  name="trash"
                  size={18}
                  tintColor={colors.negative}
                />
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
        </View>
      ) : null}
    </ScrollView>
  );
}
