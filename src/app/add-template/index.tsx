import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

import { useAddTemplate } from "@/features/finance/add-template-context";
import {
  FieldGroup,
  FieldRow,
  FieldSectionLabel,
} from "@/features/finance/components/form-fields";
import { getCurrencySymbol } from "@/features/finance/format";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const TEMPLATE_TYPES = ["Expense", "Income", "Transfer"];

function closeTemplateForm() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }

  router.replace("/templates");
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

export default function AddTemplateScreen() {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const editingId = Array.isArray(id) ? id[0] : id;
  const deleteTemplate = useMutation(api.finance.deleteTransactionTemplate);
  const [isDeleting, setIsDeleting] = useState(false);
  const { accounts } = useFinance();
  const {
    accountId,
    amount,
    category,
    isLoadingExisting,
    isSubmitting,
    merchant,
    name,
    setAmount,
    setMerchant,
    setName,
    setTransactionCharge,
    setType,
    tags,
    toAccountId,
    transactionCharge,
    type,
  } = useAddTemplate();
  const account = accounts.find((item) => item.id === accountId);
  const toAccount = accounts.find((item) => item.id === toAccountId);
  const amountColor =
    type === "income"
      ? colors.positive
      : type === "expense"
        ? colors.negative
        : colors.foreground;
  const currencySymbol = getCurrencySymbol(
    account?.currency ?? accounts[0]?.currency ?? "GHS"
  );
  const typeIndex = type === "income" ? 1 : type === "transfer" ? 2 : 0;

  const confirmDelete = useCallback(() => {
    if (!editingId || isSubmitting || isDeleting) {
      return;
    }

    Alert.alert(
      "Delete template?",
      "This template will be permanently deleted.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteTemplate({
                id: editingId as Id<"transactionTemplates">,
              });
              closeTemplateForm();
            } catch (error) {
              Alert.alert(
                "Could not delete template",
                error instanceof Error ? error.message : "Please try again."
              );
            } finally {
              setIsDeleting(false);
            }
          },
          style: "destructive",
          text: "Delete",
        },
      ]
    );
  }, [deleteTemplate, editingId, isDeleting, isSubmitting]);

  if (isLoadingExisting) {
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

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 18,
        paddingBottom: 40,
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
        values={TEMPLATE_TYPES}
      />

      <FieldGroup>
        <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
          <TextInput
            onChangeText={setName}
            placeholder="Template name"
            placeholderTextColor={colors.muted}
            style={{ color: colors.foreground, fontSize: 18, minHeight: 44 }}
            value={name}
          />
        </View>
        <View
          style={{
            alignItems: "baseline",
            borderTopColor: colors.border,
            borderTopWidth: 1,
            flexDirection: "row",
            gap: 10,
            paddingHorizontal: 18,
            paddingTop: 12,
          }}
        >
          <Text style={{ color: amountColor, fontSize: 30, fontWeight: "700" }}>
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
              fontSize: 46,
              fontWeight: "700",
              minHeight: 68,
              textAlign: "right",
            }}
            value={amount}
          />
        </View>
        {type === "expense" ? (
          <View
            style={{
              alignItems: "center",
              borderTopColor: colors.border,
              borderTopWidth: 1,
              flexDirection: "row",
              gap: 12,
              minHeight: 58,
              paddingHorizontal: 18,
            }}
          >
            <SymbolView
              name="creditcard.fill"
              size={17}
              tintColor={colors.muted}
            />
            <Text style={{ color: colors.foreground, flex: 1, fontSize: 16 }}>
              Transaction charge
            </Text>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setTransactionCharge}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              style={{
                color: colors.foreground,
                fontSize: 17,
                minHeight: 58,
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
            minHeight: 74,
            paddingHorizontal: 18,
          }}
        >
          <TextInput
            multiline
            onChangeText={setMerchant}
            placeholder="Description (optional)"
            placeholderTextColor={colors.muted}
            style={{
              color: colors.foreground,
              fontSize: 17,
              minHeight: 74,
              paddingVertical: 16,
            }}
            value={merchant}
          />
        </View>
      </FieldGroup>

      <View>
        <FieldSectionLabel>Details</FieldSectionLabel>
        <FieldGroup>
          <FieldRow
            icon={account?.symbol ?? "building.columns.fill"}
            iconColor={account?.color ?? "#8E8E93"}
            label={type === "transfer" ? "From Account" : "Account"}
            onPress={() =>
              router.push({
                params: { field: "from" },
                pathname: "/add-template/account",
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
                  pathname: "/add-template/account",
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
              onPress={() => router.push("/add-template/category")}
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
            icon="tag.fill"
            iconColor="#AF52DE"
            label="Tags"
            last
            onPress={() => router.push("/add-template/tags")}
            value={tagsLabel(tags)}
          />
        </FieldGroup>
      </View>

      {editingId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete template"
          disabled={isSubmitting || isDeleting}
          onPress={confirmDelete}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: "transparent",
            borderCurve: "continuous",
            borderRadius: 18,
            justifyContent: "center",
            minHeight: 56,
            opacity: pressed || isSubmitting || isDeleting ? 0.6 : 1,
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
