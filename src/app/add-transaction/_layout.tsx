import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { fetch } from "expo/fetch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform } from "react-native";

import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { AddTransactionContext } from "@/features/finance/add-transaction-context";
import type {
  TransactionAttachmentDraft,
  TransactionLabelDraft,
  TransactionTag,
} from "@/features/finance/add-transaction-context";
import {
  buildEditFormState,
  clearTransactionEditPrefill,
  getTransactionEditPrefill,
} from "@/features/finance/edit-transaction-prefill";
import {
  TRANSACTION_CATEGORIES,
  TRANSFER_CATEGORY,
} from "@/features/finance/transaction-categories";
import type { TransactionCategory } from "@/features/finance/transaction-categories";
import type { TransactionTemplate } from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import { useLocalProfile } from "@/features/finance/use-local-profile";
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

const DEFAULT_LABEL_DRAFT: TransactionLabelDraft = {
  color: "#8E8E93",
  name: "",
  symbol: "square.grid.2x2.fill",
};

function closeAddTransaction() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }

  router.replace("/dashboard");
}

export default function AddTransactionLayout() {
  const colors = useThemeColors();
  const disableHeaderBlur = shouldDisableHeaderBlur();
  const { transactionId } = useLocalSearchParams<{
    transactionId?: string | string[];
  }>();
  const editingTransactionId = Array.isArray(transactionId)
    ? transactionId[0]
    : transactionId;
  const editPrefill = editingTransactionId
    ? getTransactionEditPrefill(editingTransactionId)
    : undefined;
  const initialEditState = editPrefill ? buildEditFormState(editPrefill) : null;
  const createTransaction = useMutation(api.finance.createTransaction);
  const updateTransaction = useMutation(api.finance.updateTransaction);
  const generateAttachmentUploadUrl = useMutation(
    api.finance.generateAttachmentUploadUrl
  );
  const existingTransaction = useQuery(
    api.finance.getTransaction,
    editingTransactionId && !initialEditState
      ? { id: editingTransactionId as Id<"transactions"> }
      : "skip"
  );
  const { accounts } = useFinance();
  const { firstName } = useLocalProfile();
  const hasHydratedRef = useRef(Boolean(initialEditState));
  const [accountId, setAccountId] = useState<string | null>(
    initialEditState?.accountId ?? null
  );
  const [amount, setAmount] = useState(initialEditState?.amount ?? "");
  const [attachments, setAttachments] = useState<TransactionAttachmentDraft[]>(
    []
  );
  const [category, setCategory] = useState<string | null>(
    initialEditState?.category ?? null
  );
  const [customCategories, setCustomCategories] = useState<
    TransactionCategory[]
  >(initialEditState?.customCategories ?? []);
  const [date, setDate] = useState(() => initialEditState?.date ?? Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [labelDraft, setLabelDraft] =
    useState<TransactionLabelDraft>(DEFAULT_LABEL_DRAFT);
  const [narration, setNarration] = useState(initialEditState?.narration ?? "");
  const [transactionCharge, setTransactionCharge] = useState(
    initialEditState?.transactionCharge ?? ""
  );
  const [toAccountId, setToAccountId] = useState<string | null>(
    initialEditState?.toAccountId ?? null
  );
  const [transactionTypeIndex, setTransactionTypeIndex] = useState(
    initialEditState?.transactionTypeIndex ?? 0
  );
  const [tags, setTags] = useState<TransactionTag[]>(
    initialEditState?.tags ?? []
  );
  const isEditing = Boolean(editingTransactionId);
  const isLoadingExisting =
    isEditing && !initialEditState && existingTransaction === undefined;
  const transactionNotFound =
    isEditing && !initialEditState && existingTransaction === null;

  useEffect(
    () => () => {
      if (editingTransactionId) {
        clearTransactionEditPrefill(editingTransactionId);
      }
    },
    [editingTransactionId]
  );

  useEffect(() => {
    if (!transactionNotFound) {
      return;
    }

    Alert.alert(
      "Transaction not found",
      "This transaction may have been deleted.",
      [
        {
          onPress: () => {
            closeAddTransaction();
          },
          text: "OK",
        },
      ]
    );
  }, [transactionNotFound]);

  useEffect(() => {
    if (!existingTransaction || hasHydratedRef.current) {
      return;
    }

    hasHydratedRef.current = true;
    setAccountId(existingTransaction.accountId);
    setAmount(minorUnitsToAmountInput(existingTransaction.amount));
    setCategory(existingTransaction.category);
    setDate(new Date(existingTransaction.date).getTime());
    setTransactionTypeIndex(
      existingTransaction.type === "transfer"
        ? 2
        : existingTransaction.type === "income"
          ? 1
          : 0
    );
    setToAccountId(existingTransaction.toAccountId ?? null);
    setTags(existingTransaction.tags);
    setTransactionCharge(
      existingTransaction.transactionChargeAmount
        ? minorUnitsToAmountInput(existingTransaction.transactionChargeAmount)
        : ""
    );

    const isDefaultMerchant =
      existingTransaction.merchant === existingTransaction.category;
    setNarration(isDefaultMerchant ? "" : existingTransaction.merchant);

    const isBuiltInCategory = TRANSACTION_CATEGORIES.some(
      (item) => item.name === existingTransaction.category
    );
    setCustomCategories(
      isBuiltInCategory
        ? []
        : [
            {
              color: existingTransaction.color,
              keywords: [],
              name: existingTransaction.category,
              symbol: existingTransaction.symbol,
            },
          ]
    );
  }, [existingTransaction]);

  const effectiveAccountId =
    accountId ??
    (accounts.find((account) => account.name === "Everyday") ?? accounts[0])
      ?.id ??
    null;
  const addCustomCategory = useCallback((newCategory: TransactionCategory) => {
    setCustomCategories((current) => [
      ...current.filter((item) => item.name !== newCategory.name),
      newCategory,
    ]);
  }, []);
  const addAttachments = useCallback(
    (newAttachments: TransactionAttachmentDraft[]) => {
      setAttachments((current) => [
        ...current,
        ...newAttachments.filter(
          (attachment) =>
            !current.some((currentItem) => currentItem.id === attachment.id)
        ),
      ]);
    },
    []
  );
  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== id)
    );
  }, []);
  const applyTemplate = useCallback(
    (template: TransactionTemplate) => {
      setAccountId(template.accountId);
      setAmount(minorUnitsToAmountInput(template.amount));
      setNarration(template.merchant);
      setTags(template.tags);
      setToAccountId(template.toAccountId);
      setTransactionCharge(
        template.transactionCharge
          ? minorUnitsToAmountInput(template.transactionCharge)
          : ""
      );
      setTransactionTypeIndex(
        template.type === "transfer" ? 2 : template.type === "income" ? 1 : 0
      );

      if (template.type === "transfer") {
        setCategory(TRANSFER_CATEGORY.name);
        return;
      }

      setCategory(template.category);
      const isBuiltInCategory = TRANSACTION_CATEGORIES.some(
        (item) => item.name === template.category
      );
      if (!isBuiltInCategory) {
        addCustomCategory({
          color: template.color,
          keywords: [],
          name: template.category,
          symbol: template.symbol,
        });
      }
    },
    [addCustomCategory]
  );
  const toggleTag = useCallback((tag: TransactionTag) => {
    setTags((current) =>
      current.some((item) => item.id === tag.id)
        ? current.filter((item) => item.id !== tag.id)
        : [...current, tag]
    );
  }, []);
  const transactionContext = useMemo(
    () => ({
      accountId: effectiveAccountId,
      addAttachments,
      addCustomCategory,
      amount,
      applyTemplate,
      attachments,
      category,
      customCategories,
      date,
      labelDraft,
      narration,
      removeAttachment,
      setAccountId,
      setAmount,
      setCategory,
      setDate,
      setLabelDraft,
      setNarration,
      setToAccountId,
      setTransactionCharge,
      setTransactionTypeIndex,
      tags,
      toAccountId,
      toggleTag,
      transactionCharge,
      transactionTypeIndex,
    }),
    [
      addCustomCategory,
      addAttachments,
      applyTemplate,
      effectiveAccountId,
      amount,
      attachments,
      category,
      customCategories,
      date,
      labelDraft,
      narration,
      removeAttachment,
      tags,
      toAccountId,
      toggleTag,
      transactionCharge,
      transactionTypeIndex,
    ]
  );
  const submit = useCallback(async () => {
    if (isSubmitting || isLoadingExisting) {
      return;
    }

    const amountInMinorUnits = amountInputToMinorUnits(amount);
    const chargeInMinorUnits = amountInputToMinorUnits(transactionCharge);
    const trimmedNarration = narration.trim();
    const isTransfer = transactionTypeIndex === 2;
    const account = accounts.find((item) => item.id === effectiveAccountId);
    const toAccount = accounts.find((item) => item.id === toAccountId);
    const selectedCategory = isTransfer
      ? TRANSFER_CATEGORY
      : [...TRANSACTION_CATEGORIES, ...customCategories].find(
          (item) => item.name === category
        );

    if (amountInMinorUnits <= 0) {
      Alert.alert("Missing amount", "Enter a transaction amount to continue.");
      return;
    }

    if (isTransfer) {
      if (!account || !toAccount) {
        Alert.alert("Missing accounts", "Choose both from and to accounts.");
        return;
      }
      if (account.id === toAccount.id) {
        Alert.alert(
          "Invalid transfer",
          "From and to accounts must be different."
        );
        return;
      }
    } else if (!selectedCategory || !account) {
      Alert.alert(
        "Missing transaction details",
        "Enter an amount, then choose a category and account."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const merchant =
        trimmedNarration ||
        (isTransfer
          ? `Transfer to ${toAccount!.name}`
          : selectedCategory!.name);
      const transactionType = isTransfer
        ? "transfer"
        : transactionTypeIndex === 1
          ? "income"
          : "expense";

      if (isEditing && editingTransactionId) {
        await updateTransaction({
          accountId: account!.id as Id<"accounts">,
          amount: amountInMinorUnits,
          category: selectedCategory!.name,
          color: selectedCategory!.color,
          createdByName: firstName,
          date,
          id: editingTransactionId as Id<"transactions">,
          merchant,
          symbol: selectedCategory!.symbol,
          tagIds: tags.map((tag) => tag.id as Id<"tags">),
          toAccountId: isTransfer
            ? (toAccount!.id as Id<"accounts">)
            : undefined,
          transactionCharge:
            transactionType === "expense" && chargeInMinorUnits > 0
              ? chargeInMinorUnits
              : undefined,
          type: transactionType,
        });
        closeAddTransaction();
        return;
      }

      const uploadedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          const uploadUrl = await generateAttachmentUploadUrl();
          const fileResponse = await fetch(attachment.uri);
          if (!fileResponse.ok) {
            throw new Error("Could not read attachment");
          }
          const blob = await fileResponse.blob();
          const uploadResponse = await fetch(uploadUrl, {
            body: blob,
            headers: {
              "Content-Type": attachment.mimeType ?? "application/octet-stream",
            },
            method: "POST",
          });
          if (!uploadResponse.ok) {
            throw new Error("Could not upload attachment");
          }
          const { storageId } = (await uploadResponse.json()) as {
            storageId: Id<"_storage">;
          };
          return {
            name: attachment.name,
            storageId,
            ...(attachment.mimeType ? { mimeType: attachment.mimeType } : {}),
            ...(attachment.size !== undefined ? { size: attachment.size } : {}),
          };
        })
      );

      await createTransaction({
        accountId: account!.id as Id<"accounts">,
        amount: amountInMinorUnits,
        attachments: uploadedAttachments,
        category: selectedCategory!.name,
        color: selectedCategory!.color,
        createdByName: firstName,
        date,
        merchant,
        symbol: selectedCategory!.symbol,
        tagIds: tags.map((tag) => tag.id as Id<"tags">),
        toAccountId: isTransfer ? (toAccount!.id as Id<"accounts">) : undefined,
        transactionCharge:
          transactionType === "expense" && chargeInMinorUnits > 0
            ? chargeInMinorUnits
            : undefined,
        type: transactionType,
      });
      closeAddTransaction();
    } catch {
      Alert.alert("Could not save transaction", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    accounts,
    amount,
    attachments,
    category,
    createTransaction,
    customCategories,
    date,
    editingTransactionId,
    effectiveAccountId,
    firstName,
    generateAttachmentUploadUrl,
    isEditing,
    isLoadingExisting,
    isSubmitting,
    narration,
    tags,
    toAccountId,
    transactionCharge,
    transactionTypeIndex,
    updateTransaction,
  ]);

  return (
    <AddTransactionContext.Provider value={transactionContext}>
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
            title: isEditing ? "Edit transaction" : "Add transaction",
          }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Close"
              icon="xmark"
              onPress={() => {
                closeAddTransaction();
              }}
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
                accessibilityLabel="Save transaction"
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
          name="category"
          options={{
            headerBackVisible: false,
            headerLargeTitle: false,
            title: "Category",
          }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => {
                router.back();
              }}
              separateBackground
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              accessibilityLabel="Add category"
              icon="plus"
              onPress={() => router.push("/add-transaction/category-new")}
            />
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
          name="category-new"
          options={{ headerBackVisible: false, title: "New category" }}
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
          name="category-icon"
          options={{ headerBackVisible: false, title: "Icon" }}
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
          name="label-name"
          options={{ headerBackVisible: false, title: "Name" }}
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
          name="color"
          options={{ headerBackVisible: false, title: "Color" }}
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
              onPress={() => router.push("/add-transaction/tag-new")}
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
        <Stack.Screen
          name="attachments"
          options={{ headerBackVisible: false, title: "Attachments" }}
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
          name="templates"
          options={{ headerBackVisible: false, title: "Templates" }}
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
              accessibilityLabel="Add template"
              icon="plus"
              onPress={() => router.push("/add-template")}
            />
          </Stack.Toolbar>
        </Stack.Screen>
      </Stack>
    </AddTransactionContext.Provider>
  );
}
