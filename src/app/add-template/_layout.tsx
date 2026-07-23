import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform } from "react-native";

import { HeaderIconButton } from "@/components/header-icon-button";
import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { MaterialIcons } from "@/constants/material-icons";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AddTemplateContext } from "@/features/finance/add-template-context";
import { DEFAULT_LABEL_COLOR } from "@/features/finance/color-utils";
import { TRANSFER_CATEGORY } from "@/features/finance/transaction-categories";
import type { TransactionCategory } from "@/features/finance/transaction-categories";
import type {
  TransactionTag,
  TransactionTemplateType,
} from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

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
  const [tagColorDraft, setTagColorDraft] = useState(DEFAULT_LABEL_COLOR);
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
      setTagColorDraft,
      setToAccountId,
      setTransactionCharge,
      setType,
      submit: () => {
        void submit();
      },
      tagColorDraft,
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
      tagColorDraft,
      tags,
      toAccountId,
      toggleTag,
      transactionCharge,
      type,
    ]
  );

  const renderBackButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Back"
        icon={MaterialIcons.chevronLeft}
        onPress={() => router.back()}
      />
    ),
    []
  );

  const renderCloseButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Close"
        icon={MaterialIcons.close}
        onPress={closeTemplateForm}
      />
    ),
    []
  );

  const renderSaveButton = useCallback(
    () =>
      isSubmitting || isLoadingExisting ? (
        <ActivityIndicator />
      ) : (
        <HeaderIconButton
          accessibilityLabel="Save template"
          icon={MaterialIcons.check}
          onPress={() => {
            void submit();
          }}
          tintColor={colors.primary}
        />
      ),
    [isSubmitting, isLoadingExisting, submit, colors.primary]
  );

  const renderAddCategoryButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Add category"
        icon={MaterialIcons.add}
        onPress={() => router.push("/add-category" as never)}
      />
    ),
    []
  );

  const renderAddTagButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Add tag"
        icon={MaterialIcons.add}
        onPress={() => router.push("/add-template/tag-new" as never)}
      />
    ),
    []
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
          headerStyle:
            Platform.OS === "android"
              ? { backgroundColor: colors.background }
              : undefined,
          headerTransparent: Platform.OS === "ios",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerLargeTitle: false,
            ...androidHeaderOptions({
              headerLeft: renderCloseButton,
              headerRight: renderSaveButton,
            }),
            title: isEditing ? "Edit Template" : "Add Template",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Close"
                icon="xmark"
                onPress={closeTemplateForm}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
          {Platform.OS === "ios" ? (
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
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="account"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Account",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="category"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({
              headerLeft: renderBackButton,
              headerRight: renderAddCategoryButton,
            }),
            title: "Category",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="right">
              <Stack.Toolbar.Button
                accessibilityLabel="Add category"
                icon="plus"
                onPress={() => router.push("/add-category" as never)}
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="tags"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({
              headerLeft: renderBackButton,
              headerRight: renderAddTagButton,
            }),
            title: "Tags",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="right">
              <Stack.Toolbar.Button
                accessibilityLabel="Add tag"
                onPress={() => router.push("/add-template/tag-new" as never)}
              >
                Add
              </Stack.Toolbar.Button>
              <Stack.Toolbar.Button
                accessibilityLabel="Done"
                onPress={() => router.back()}
                variant="done"
              >
                Done
              </Stack.Toolbar.Button>
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="tag-new"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Add tag",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="tag-color"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Color",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
      </Stack>
    </AddTemplateContext.Provider>
  );
}
