import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform } from "react-native";

import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { AddTemplateContext } from "@/features/finance/add-template-context";
import { TRANSFER_CATEGORY } from "@/features/finance/transaction-categories";
import type { TransactionCategory } from "@/features/finance/transaction-categories";
import type {
  TransactionTag,
  TransactionTemplateType,
} from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function amountInputToMinorUnits(value: string): number {
  const parsed = Number.parseFloat(value.replaceAll(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function minorUnitsToAmountInput(value: number): string {
  return (Math.abs(value) / 100).toFixed(2);
}

function closeTemplateForm() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }

  router.replace("/templates");
}

export default function AddTemplateLayout() {
  const colors = useThemeColors();
  const disableHeaderBlur = shouldDisableHeaderBlur();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const editingId = Array.isArray(id) ? id[0] : id;
  const { accounts } = useFinance();
  const template = useQuery(
    api.finance.getTransactionTemplate,
    editingId ? { id: editingId as Id<"transactionTemplates"> } : "skip"
  );
  const createTemplate = useMutation(api.finance.createTransactionTemplate);
  const updateTemplate = useMutation(api.finance.updateTransactionTemplate);
  const [accountId, setAccountId] = useState<string | null>(
    accounts[0]?.id ?? null
  );
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<TransactionCategory | null>(null);
  const [merchant, setMerchant] = useState("");
  const [name, setName] = useState("");
  const [tags, setTags] = useState<TransactionTag[]>([]);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [transactionCharge, setTransactionCharge] = useState("");
  const [type, setType] = useState<TransactionTemplateType>("expense");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hydratedIdRef = useRef<string | null>(null);
  const effectiveAccountId = accountId ?? accounts[0]?.id ?? null;
  const isEditing = Boolean(editingId);
  const isLoadingExisting = isEditing && template === undefined;

  useEffect(() => {
    if (!editingId || !template || hydratedIdRef.current === template.id) {
      return;
    }

    hydratedIdRef.current = template.id;
    setAccountId(template.accountId);
    setAmount(minorUnitsToAmountInput(template.amount));
    setCategory({
      color: template.color,
      keywords: [],
      name: template.category,
      symbol: template.symbol,
    });
    setMerchant(template.merchant);
    setName(template.name);
    setTags(template.tags);
    setToAccountId(template.toAccountId);
    setTransactionCharge(
      template.transactionCharge
        ? minorUnitsToAmountInput(template.transactionCharge)
        : ""
    );
    setType(template.type);
  }, [editingId, template]);

  const toggleTag = useCallback((tag: TransactionTag) => {
    setTags((current) =>
      current.some((item) => item.id === tag.id)
        ? current.filter((item) => item.id !== tag.id)
        : [...current, tag]
    );
  }, []);

  const submit = useCallback(async () => {
    if (isSubmitting || isLoadingExisting) {
      return;
    }

    const amountInMinorUnits = amountInputToMinorUnits(amount);
    const chargeInMinorUnits = amountInputToMinorUnits(transactionCharge);
    const account = accounts.find((item) => item.id === effectiveAccountId);
    const toAccount = accounts.find((item) => item.id === toAccountId);
    const selectedCategory = type === "transfer" ? TRANSFER_CATEGORY : category;

    if (!name.trim()) {
      Alert.alert("Missing name", "Enter a template name to continue.");
      return;
    }
    if (amountInMinorUnits < 0) {
      Alert.alert("Invalid amount", "Enter a valid amount to continue.");
      return;
    }
    if (!account || !selectedCategory) {
      Alert.alert("Missing details", "Choose an account and category.");
      return;
    }
    if (type === "transfer" && !toAccount) {
      Alert.alert("Missing destination", "Choose a destination account.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        accountId: account.id as Id<"accounts">,
        amount: amountInMinorUnits,
        category: selectedCategory.name,
        color: selectedCategory.color,
        merchant: merchant.trim(),
        name,
        symbol: selectedCategory.symbol,
        tagIds: tags.map((tag) => tag.id as Id<"tags">),
        toAccountId:
          type === "transfer" ? (toAccount!.id as Id<"accounts">) : undefined,
        transactionCharge:
          (type === "expense" || type === "transfer") && chargeInMinorUnits > 0
            ? chargeInMinorUnits
            : undefined,
        type,
      };

      if (editingId) {
        await updateTemplate({
          id: editingId as Id<"transactionTemplates">,
          ...payload,
        });
      } else {
        await createTemplate(payload);
      }
      closeTemplateForm();
    } catch (error) {
      Alert.alert(
        "Could not save template",
        error instanceof Error ? error.message : "Please try again."
      );
      setIsSubmitting(false);
    }
  }, [
    accounts,
    amount,
    category,
    createTemplate,
    editingId,
    effectiveAccountId,
    isLoadingExisting,
    isSubmitting,
    merchant,
    name,
    tags,
    toAccountId,
    transactionCharge,
    type,
    updateTemplate,
  ]);

  const context = useMemo(
    () => ({
      accountId: effectiveAccountId,
      amount,
      category,
      isLoadingExisting,
      isSubmitting,
      merchant,
      name,
      setAccountId,
      setAmount,
      setCategory,
      setMerchant,
      setName,
      setToAccountId,
      setTransactionCharge,
      setType,
      submit: () => {
        void submit();
      },
      tags,
      toAccountId,
      toggleTag,
      transactionCharge,
      type,
    }),
    [
      amount,
      category,
      effectiveAccountId,
      isLoadingExisting,
      isSubmitting,
      merchant,
      name,
      submit,
      tags,
      toAccountId,
      toggleTag,
      transactionCharge,
      type,
    ]
  );

  return (
    <AddTemplateContext.Provider value={context}>
      <Stack
        screenOptions={{
          headerBlurEffect:
            Platform.OS === "ios"
              ? disableHeaderBlur
                ? "none"
                : "systemMaterial"
              : undefined,
          headerShadowVisible: false,
          headerTransparent: true,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerLargeTitle: false,
            title: isEditing ? "Edit Template" : "Add Template",
          }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Close"
              icon="xmark"
              onPress={closeTemplateForm}
              separateBackground
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            {isSubmitting || isLoadingExisting ? (
              <Stack.Toolbar.View>
                <ActivityIndicator />
              </Stack.Toolbar.View>
            ) : (
              <Stack.Toolbar.Button
                accessibilityLabel="Save template"
                icon="checkmark"
                onPress={() => {
                  void submit();
                }}
                tintColor={colors.primary}
                variant="prominent"
              />
            )}
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="account"
          options={{ headerBackVisible: false, title: "Account" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="category"
          options={{ headerBackVisible: false, title: "Category" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              accessibilityLabel="Add category"
              icon="plus"
              onPress={() => router.push("/add-category" as never)}
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="tags"
          options={{ headerBackVisible: false, title: "Tags" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              accessibilityLabel="Add tag"
              icon="plus"
              onPress={() => router.push("/add-template/tag-new" as never)}
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="tag-new"
          options={{ headerBackVisible: false, title: "Add tag" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
      </Stack>
    </AddTemplateContext.Provider>
  );
}
