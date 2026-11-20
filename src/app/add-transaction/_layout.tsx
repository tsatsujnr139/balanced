import { useMutation, useQuery } from "convex/react";
import { File } from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { fetch } from "expo/fetch";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Alert, Platform } from "react-native";

import { HeaderIconButton } from "@/components/header-icon-button";
import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { MaterialIcons } from "@/constants/material-icons";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CaptureContext } from "@/features/capture/capture-context";
import { captureDraftToForm } from "@/features/capture/capture-editor";
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
  OUT_OF_WALLET_ACCOUNT_NAME,
  isOutOfWalletAccountId,
} from "@/features/finance/out-of-wallet";
import {
  TRANSACTION_CATEGORIES,
  TRANSFER_CATEGORY,
} from "@/features/finance/transaction-categories";
import type { TransactionCategory } from "@/features/finance/transaction-categories";
import {
  clearTransactionDraftPrefill,
  getTransactionDraftPrefill,
} from "@/features/finance/transaction-draft-prefill";
import {
  calculateExchangeRate,
  calculateReceivedAmount,
  positiveDecimal,
} from "@/features/finance/transfer-amounts";
import type {
  TransactionAttachmentRecord,
  TransactionTemplate,
} from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import {
  setLastTransactionAccountId,
  useLastTransactionAccountId,
} from "@/features/finance/use-last-transaction-account";
import { useLocalProfile } from "@/features/finance/use-local-profile";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

function amountInputToMinorUnits(value: string): number {
  const parsed = Number.parseFloat(value.replaceAll(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function minorUnitsToAmountInput(value: number): string {
  return (Math.abs(value) / 100).toFixed(2);
}

function attachmentRecordToDraft(
  record: TransactionAttachmentRecord
): TransactionAttachmentDraft {
  return {
    id: record.id,
    name: record.name,
    storageId: record.storageId,
    uri: record.url ?? "",
    ...(record.mimeType !== undefined ? { mimeType: record.mimeType } : {}),
    ...(record.size !== undefined ? { size: record.size } : {}),
  };
}

const DEFAULT_LABEL_DRAFT: TransactionLabelDraft = {
  color: "#8E8E93",
  name: "",
  symbol: "square.grid.2x2.fill",
};

const CAPTURE_SHEET_REOPEN_DELAY_MS = 500;

/** Swaps this sheet for the capture sheet (sheets can't stack). */
function openCapture() {
  if (!router.canDismiss()) {
    router.replace("/capture");
    return;
  }
  router.dismiss();
  setTimeout(() => {
    router.push("/capture");
  }, CAPTURE_SHEET_REOPEN_DELAY_MS);
}

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
  const {
    captureDraftKey: captureDraftKeyParam,
    accountId: accountIdParam,
    draftId: draftIdParam,
    formMode: formModeParam,
    transactionId,
  } = useLocalSearchParams<{
    captureDraftKey?: string;
    accountId?: string | string[];
    draftId?: string | string[];
    formMode?: string | string[];
    transactionId?: string | string[];
  }>();
  const captureDraftKey = useRef(captureDraftKeyParam).current;
  const capture = useContext(CaptureContext);
  const capturedDraft = capture?.drafts.find(
    (draft) => draft.key === captureDraftKey
  );
  const isCaptureDraft = Boolean(captureDraftKey && capturedDraft);
  const routeBase: "/capture/edit" | "/add-transaction" = isCaptureDraft
    ? "/capture/edit"
    : "/add-transaction";
  const closeForm = useCallback(() => {
    if (captureDraftKey) {
      router.back();
    } else {
      closeAddTransaction();
    }
  }, [captureDraftKey]);
  const initialAccountId = Array.isArray(accountIdParam)
    ? accountIdParam[0]
    : accountIdParam;
  const formMode = Array.isArray(formModeParam)
    ? formModeParam[0]
    : formModeParam;
  const draftId = Array.isArray(draftIdParam) ? draftIdParam[0] : draftIdParam;
  const transactionIdParam = Array.isArray(transactionId)
    ? transactionId[0]
    : transactionId;
  const isCreateMode =
    formMode === "create" || Boolean(draftId) || isCaptureDraft;
  const editingTransactionId = isCreateMode ? undefined : transactionIdParam;
  const initialDraftPrefillRef = useRef(
    capturedDraft && capture
      ? captureDraftToForm(capturedDraft, capture.images)
      : draftId
        ? getTransactionDraftPrefill(draftId)
        : undefined
  );
  const draftPrefill = initialDraftPrefillRef.current;
  const initialNewTransactionAccountId = editingTransactionId
    ? null
    : (initialAccountId ?? null);
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
  const existingAttachments = useQuery(
    api.finance.listTransactionAttachments,
    editingTransactionId
      ? { id: editingTransactionId as Id<"transactions"> }
      : "skip"
  );
  const { accounts } = useFinance();
  const { firstName } = useLocalProfile();
  const lastTransactionAccountId = useLastTransactionAccountId();
  const hasHydratedRef = useRef(Boolean(initialEditState));
  const attachmentsHydratedRef = useRef(false);
  const [accountId, setAccountIdValue] = useState<string | null>(
    draftPrefill?.accountId ??
      initialEditState?.accountId ??
      initialNewTransactionAccountId
  );
  const [amount, setAmountValue] = useState(
    draftPrefill?.amount ?? initialEditState?.amount ?? ""
  );
  const [attachments, setAttachments] = useState<TransactionAttachmentDraft[]>(
    draftPrefill?.attachments ?? []
  );
  const [category, setCategory] = useState<string | null>(
    draftPrefill?.category ?? initialEditState?.category ?? null
  );
  const [customCategories, setCustomCategories] = useState<
    TransactionCategory[]
  >(draftPrefill?.customCategories ?? initialEditState?.customCategories ?? []);
  const [date, setDate] = useState(
    () => draftPrefill?.date ?? initialEditState?.date ?? Date.now()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [labelDraft, setLabelDraft] =
    useState<TransactionLabelDraft>(DEFAULT_LABEL_DRAFT);
  const [tagColorDraft, setTagColorDraft] = useState(DEFAULT_LABEL_DRAFT.color);
  const [narration, setNarration] = useState(
    draftPrefill?.narration ?? initialEditState?.narration ?? ""
  );
  const [transactionCharge, setTransactionCharge] = useState(
    draftPrefill?.transactionCharge ?? initialEditState?.transactionCharge ?? ""
  );
  const [toAccountId, setToAccountIdValue] = useState<string | null>(
    draftPrefill?.toAccountId ?? initialEditState?.toAccountId ?? null
  );
  const [toAmount, setToAmountValue] = useState(
    draftPrefill?.toAmount ?? initialEditState?.toAmount ?? ""
  );
  const [exchangeRate, setExchangeRateValue] = useState(() =>
    calculateExchangeRate(
      draftPrefill?.amount ?? initialEditState?.amount ?? "",
      draftPrefill?.toAmount ?? initialEditState?.toAmount ?? ""
    )
  );
  const setAmount = useCallback(
    (value: string) => {
      setAmountValue(value);
      if (positiveDecimal(exchangeRate)) {
        setToAmountValue(calculateReceivedAmount(value, exchangeRate));
      }
    },
    [exchangeRate]
  );
  const setToAmount = useCallback(
    (value: string) => {
      setToAmountValue(value);
      setExchangeRateValue(calculateExchangeRate(amount, value));
    },
    [amount]
  );
  const setExchangeRate = useCallback(
    (value: string) => {
      setExchangeRateValue(value);
      setToAmountValue(calculateReceivedAmount(amount, value));
    },
    [amount]
  );
  const [transactionTypeIndex, setTransactionTypeIndex] = useState(
    draftPrefill?.transactionTypeIndex ??
      initialEditState?.transactionTypeIndex ??
      0
  );
  const [tags, setTags] = useState<TransactionTag[]>(
    draftPrefill?.tags ?? initialEditState?.tags ?? []
  );
  const isEditing = Boolean(editingTransactionId);
  const isLoadingExisting =
    isEditing && !initialEditState && existingTransaction === undefined;
  const transactionNotFound =
    isEditing && !initialEditState && existingTransaction === null;

  const sourceCurrency =
    accounts.find((account) => account.id === accountId)?.currency ??
    capturedDraft?.captured.transaction.currency;
  const destinationCurrency =
    accounts.find((account) => account.id === toAccountId)?.currency ??
    capturedDraft?.captured.transaction.transfer?.toCurrency;
  const setAccountId = useCallback(
    (id: string) => {
      const nextCurrency = accounts.find(
        (account) => account.id === id
      )?.currency;
      if (sourceCurrency && nextCurrency !== sourceCurrency) {
        setToAmountValue("");
        setExchangeRateValue("");
      }
      setAccountIdValue(id);
    },
    [accounts, sourceCurrency]
  );
  const setToAccountId = useCallback(
    (id: string) => {
      const nextCurrency = accounts.find(
        (account) => account.id === id
      )?.currency;
      if (destinationCurrency && nextCurrency !== destinationCurrency) {
        setToAmountValue("");
        setExchangeRateValue("");
      }
      setToAccountIdValue(id);
    },
    [accounts, destinationCurrency]
  );

  useEffect(
    () => () => {
      if (editingTransactionId) {
        clearTransactionEditPrefill(editingTransactionId);
      }
      if (draftId) {
        clearTransactionDraftPrefill(draftId);
      }
    },
    [draftId, editingTransactionId]
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
            closeForm();
          },
          text: "OK",
        },
      ]
    );
  }, [closeForm, transactionNotFound]);

  useEffect(() => {
    if (!existingTransaction || hasHydratedRef.current) {
      return;
    }

    hasHydratedRef.current = true;
    setAccountIdValue(existingTransaction.accountId);
    setAmountValue(minorUnitsToAmountInput(existingTransaction.amount));
    setCategory(existingTransaction.category);
    setDate(new Date(existingTransaction.date).getTime());
    setTransactionTypeIndex(
      existingTransaction.type === "transfer"
        ? 2
        : existingTransaction.type === "income"
          ? 1
          : 0
    );
    setToAccountIdValue(existingTransaction.toAccountId ?? null);
    setExchangeRateValue(
      calculateExchangeRate(
        minorUnitsToAmountInput(existingTransaction.amount),
        existingTransaction.toAmount === undefined
          ? ""
          : minorUnitsToAmountInput(existingTransaction.toAmount)
      )
    );
    setToAmountValue(
      existingTransaction.toAmount !== undefined &&
        existingTransaction.toCurrency !== existingTransaction.currency
        ? minorUnitsToAmountInput(existingTransaction.toAmount)
        : ""
    );
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

  useEffect(() => {
    if (attachmentsHydratedRef.current || !existingAttachments) {
      return;
    }

    attachmentsHydratedRef.current = true;
    setAttachments((current) => {
      const currentIds = new Set(current.map((attachment) => attachment.id));
      return [
        ...current,
        ...existingAttachments
          .filter((attachment) => !currentIds.has(attachment.id))
          .map(attachmentRecordToDraft),
      ];
    });
  }, [existingAttachments]);

  const effectiveAccountId =
    accountId ??
    accounts.find((account) => account.id === lastTransactionAccountId)?.id ??
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
      setAccountIdValue(template.accountId);
      setExchangeRateValue("");
      setToAmountValue("");
      setAmountValue(
        template.amount === 0 ? "" : minorUnitsToAmountInput(template.amount)
      );
      setNarration(template.merchant);
      setTags(template.tags);
      setToAccountIdValue(template.toAccountId);
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
      routeBase,
      isCaptureDraft,
      exchangeRate,
      setExchangeRate,
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
      setTagColorDraft,
      setToAccountId,
      setToAmount,
      setTransactionCharge,
      setTransactionTypeIndex,
      tagColorDraft,
      tags,
      toAccountId,
      toAmount,
      toggleTag,
      transactionCharge,
      transactionTypeIndex,
    }),
    [
      routeBase,
      isCaptureDraft,
      exchangeRate,
      setExchangeRate,
      setAmount,
      setToAmount,
      setAccountId,
      setToAccountId,
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
      tagColorDraft,
      tags,
      toAccountId,
      toAmount,
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
    const isFromOutOfWallet =
      isTransfer && isOutOfWalletAccountId(effectiveAccountId);
    const isToOutOfWallet = isTransfer && isOutOfWalletAccountId(toAccountId);
    const account = isFromOutOfWallet
      ? null
      : accounts.find((item) => item.id === effectiveAccountId);
    const toAccount = isToOutOfWallet
      ? null
      : accounts.find((item) => item.id === toAccountId);
    const trackedTransferAccount = isFromOutOfWallet ? toAccount : account;
    const isCrossCurrency =
      isTransfer &&
      Boolean(account && toAccount) &&
      account?.currency !== toAccount?.currency;
    const toAmountInMinorUnits = amountInputToMinorUnits(toAmount);
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
      if (isFromOutOfWallet && isToOutOfWallet) {
        Alert.alert(
          "Invalid transfer",
          "Choose at least one account tracked in the app."
        );
        return;
      }
      if (
        !trackedTransferAccount ||
        (!isFromOutOfWallet && !isToOutOfWallet && !toAccount)
      ) {
        Alert.alert("Missing accounts", "Choose both from and to accounts.");
        return;
      }
      if (
        !isFromOutOfWallet &&
        !isToOutOfWallet &&
        account?.id === toAccount?.id
      ) {
        Alert.alert(
          "Invalid transfer",
          "From and to accounts must be different."
        );
        return;
      }
      if (isCrossCurrency && toAmountInMinorUnits <= 0) {
        Alert.alert(
          "Missing received amount",
          `Enter how much ${toAccount?.name ?? "the account"} received in ${toAccount?.currency ?? "its currency"}.`
        );
        return;
      }
    } else if (!account || (isEditing && !selectedCategory)) {
      Alert.alert(
        "Missing transaction details",
        isEditing
          ? "Choose a category and account."
          : "Choose an account to continue."
      );
      return;
    }

    if (isCaptureDraft && capture && captureDraftKey) {
      capture.applyDraftForm(captureDraftKey, {
        accountId: effectiveAccountId,
        amount,
        attachments,
        category,
        customCategories: selectedCategory
          ? [
              ...customCategories.filter(
                (item) => item.name !== selectedCategory.name
              ),
              { ...selectedCategory, keywords: [] },
            ]
          : customCategories,
        date,
        narration,
        tags,
        toAccountId,
        toAmount,
        transactionCharge,
        transactionTypeIndex,
      });
      closeForm();
      return;
    }

    setIsSubmitting(true);
    try {
      const merchant = isTransfer
        ? trimmedNarration ||
          (isFromOutOfWallet
            ? `Transfer from ${OUT_OF_WALLET_ACCOUNT_NAME}`
            : `Transfer to ${
                isToOutOfWallet ? OUT_OF_WALLET_ACCOUNT_NAME : toAccount!.name
              }`)
        : trimmedNarration;
      const transactionType = isTransfer
        ? "transfer"
        : transactionTypeIndex === 1
          ? "income"
          : "expense";

      const uploadedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          if (attachment.storageId) {
            return {
              name: attachment.name,
              mimeType: attachment.mimeType,
              storageId: attachment.storageId as Id<"_storage">,
              ...(attachment.size !== undefined
                ? { size: attachment.size }
                : {}),
            };
          }

          const file = new File(attachment.uri);
          if (!file.exists) {
            throw new Error("Could not read attachment");
          }

          const uploadUrl = await generateAttachmentUploadUrl();
          const contentType =
            attachment.mimeType || file.type || "application/octet-stream";
          const uploadResponse = await fetch(uploadUrl, {
            body: file,
            headers: {
              "Content-Type": contentType,
            },
            method: "POST",
          });
          if (!uploadResponse.ok) {
            throw new Error("Could not upload attachment");
          }
          const { storageId } = (await uploadResponse.json()) as {
            storageId: Id<"_storage">;
          };
          const size =
            typeof attachment.size === "number" &&
            Number.isFinite(attachment.size)
              ? attachment.size
              : file.size;

          return {
            name: attachment.name,
            mimeType: contentType,
            storageId,
            ...(Number.isFinite(size) && size > 0 ? { size } : {}),
          };
        })
      );

      if (isEditing && editingTransactionId) {
        await updateTransaction({
          accountId: trackedTransferAccount!.id as Id<"accounts">,
          amount: amountInMinorUnits,
          attachments: uploadedAttachments,
          category: selectedCategory!.name,
          color: selectedCategory!.color,
          createdByName: firstName,
          date,
          id: editingTransactionId as Id<"transactions">,
          merchant,
          symbol: selectedCategory!.symbol,
          tagIds: tags.map((tag) => tag.id as Id<"tags">),
          externalTransferSide: isFromOutOfWallet
            ? "from"
            : isToOutOfWallet
              ? "to"
              : undefined,
          toAccountId:
            isTransfer && !(isFromOutOfWallet || isToOutOfWallet)
              ? (toAccount!.id as Id<"accounts">)
              : undefined,
          toAmount: isCrossCurrency ? toAmountInMinorUnits : undefined,
          transactionCharge:
            (transactionType === "expense" || transactionType === "transfer") &&
            chargeInMinorUnits > 0
              ? chargeInMinorUnits
              : undefined,
          type: transactionType,
        });
        setLastTransactionAccountId(trackedTransferAccount!.id);
        closeForm();
        return;
      }

      await createTransaction({
        accountId: trackedTransferAccount!.id as Id<"accounts">,
        amount: amountInMinorUnits,
        attachments: uploadedAttachments,
        category: selectedCategory?.name,
        color: selectedCategory?.color,
        createdByName: firstName,
        date,
        merchant,
        symbol: selectedCategory?.symbol,
        tagIds: tags.map((tag) => tag.id as Id<"tags">),
        externalTransferSide: isFromOutOfWallet
          ? "from"
          : isToOutOfWallet
            ? "to"
            : undefined,
        toAccountId:
          isTransfer && !(isFromOutOfWallet || isToOutOfWallet)
            ? (toAccount!.id as Id<"accounts">)
            : undefined,
        toAmount: isCrossCurrency ? toAmountInMinorUnits : undefined,
        transactionCharge:
          (transactionType === "expense" || transactionType === "transfer") &&
          chargeInMinorUnits > 0
            ? chargeInMinorUnits
            : undefined,
        type: transactionType,
      });
      setLastTransactionAccountId(trackedTransferAccount!.id);
      closeForm();
    } catch {
      Alert.alert("Could not save transaction", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    capture,
    captureDraftKey,
    closeForm,
    isCaptureDraft,
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
    toAmount,
    transactionCharge,
    transactionTypeIndex,
    updateTransaction,
  ]);

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
        onPress={closeForm}
      />
    ),
    [closeForm]
  );

  const renderSaveButton = useCallback(
    () =>
      isSubmitting || isLoadingExisting ? (
        <ActivityIndicator />
      ) : (
        <HeaderIconButton
          accessibilityLabel={
            isCaptureDraft ? "Apply changes" : "Save transaction"
          }
          icon={MaterialIcons.check}
          onPress={() => {
            void submit();
          }}
          tintColor={colors.primary}
        />
      ),
    [isCaptureDraft, isSubmitting, isLoadingExisting, submit, colors.primary]
  );

  const renderAddCategoryButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Add category"
        icon={MaterialIcons.add}
        onPress={() => router.push(`${routeBase}/category-new`)}
      />
    ),
    [routeBase]
  );

  const renderAddTagButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Add tag"
        icon={MaterialIcons.add}
        onPress={() => router.push(`${routeBase}/tag-new`)}
      />
    ),
    [routeBase]
  );

  const renderAddTemplateButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Add template"
        icon={MaterialIcons.add}
        onPress={() => router.push("/add-template")}
      />
    ),
    []
  );

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
            title: isCaptureDraft
              ? "Edit captured transaction"
              : isEditing
                ? "Edit transaction"
                : "Add transaction",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Close"
                icon="xmark"
                onPress={() => {
                  closeForm();
                }}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="right">
              {isEditing || isCaptureDraft ? null : (
                <Stack.Toolbar.Button
                  accessibilityLabel="Capture from text or screenshots"
                  icon="text.viewfinder"
                  onPress={openCapture}
                />
              )}
              {isSubmitting || isLoadingExisting ? (
                <Stack.Toolbar.View>
                  <ActivityIndicator />
                </Stack.Toolbar.View>
              ) : (
                <Stack.Toolbar.Button
                  accessibilityLabel={
                    isCaptureDraft ? "Apply changes" : "Save transaction"
                  }
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
          name="category"
          options={{
            headerBackVisible: false,
            headerLargeTitle: false,
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
                onPress={() => {
                  router.back();
                }}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="right">
              <Stack.Toolbar.Button
                accessibilityLabel="Add category"
                icon="plus"
                onPress={() => router.push(`${routeBase}/category-new`)}
              />
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
          name="category-new"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "New category",
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
          name="category-icon"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Icon",
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
          name="label-name"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Name",
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
          name="color"
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
                onPress={() => router.push(`${routeBase}/tag-new`)}
              >
                Add
              </Stack.Toolbar.Button>
              <Stack.Toolbar.Button
                accessibilityLabel="Done"
                icon="checkmark"
                onPress={() => router.back()}
                tintColor={colors.primary}
                variant="prominent"
              />
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
        <Stack.Screen
          name="attachments"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Attachments",
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
          name="templates"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({
              headerLeft: renderBackButton,
              headerRight: renderAddTemplateButton,
            }),
            title: "Templates",
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
                accessibilityLabel="Add template"
                icon="plus"
                onPress={() => router.push("/add-template")}
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
      </Stack>
    </AddTransactionContext.Provider>
  );
}
