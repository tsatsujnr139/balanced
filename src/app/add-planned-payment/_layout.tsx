import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, View } from "react-native";

import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { AddPlannedPaymentContext } from "@/features/finance/add-planned-payment-context";
import type {
  PlannedCategorySelection,
  PlannedTagSelection,
} from "@/features/finance/add-planned-payment-context";
import { DEFAULT_PLANNED_FREQUENCY } from "@/features/finance/planned-payment-constants";
import type {
  PlannedPaymentFrequency,
  PlannedPaymentType,
} from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const DEFAULT_START_DATE = Date.now();

export const unstable_settings = {
  anchor: "index",
};

function amountInputToMinorUnits(value: string): number {
  const parsed = Number.parseFloat(value.replaceAll(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function formatAmountInput(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2);
}

function closePlannedPaymentForm() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }

  router.replace("/planned-payments");
}

export default function AddPlannedPaymentLayout() {
  const colors = useThemeColors();
  const disableHeaderBlur = shouldDisableHeaderBlur();
  const params = useLocalSearchParams<{ draftId?: string; id?: string }>();
  const draftId = typeof params.draftId === "string" ? params.draftId : null;
  const editingId = typeof params.id === "string" ? params.id : null;
  const { accounts } = useFinance();
  const plannedPayment = useQuery(
    api.finance.getPlannedPayment,
    editingId ? { id: editingId as Id<"plannedPayments"> } : "skip"
  );
  const createPlannedPayment = useMutation(api.finance.createPlannedPayment);
  const updatePlannedPayment = useMutation(api.finance.updatePlannedPayment);
  const [type, setType] = useState<PlannedPaymentType>("expense");
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState<string | null>(
    accounts[0]?.id ?? null
  );
  const [category, setCategory] = useState<PlannedCategorySelection | null>(
    null
  );
  const [date, setDate] = useState(DEFAULT_START_DATE);
  const [frequency, setFrequency] = useState<PlannedPaymentFrequency>(
    DEFAULT_PLANNED_FREQUENCY
  );
  const [interval, setInterval] = useState(1);
  const [tags, setTags] = useState<PlannedTagSelection[]>([]);
  const [notifyOnDue, setNotifyOnDue] = useState(false);
  const [notifyOnOverdue, setNotifyOnOverdue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hydratedPaymentIdRef = useRef<string | null>(null);
  const draftIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (editingId || draftIdRef.current === draftId) {
      return;
    }

    draftIdRef.current = draftId;
    hydratedPaymentIdRef.current = null;
    setType("expense");
    setAmount("");
    setName("");
    setDescription("");
    setAccountId(accounts[0]?.id ?? null);
    setCategory(null);
    setDate(Date.now());
    setFrequency(DEFAULT_PLANNED_FREQUENCY);
    setInterval(1);
    setTags([]);
    setNotifyOnDue(false);
    setNotifyOnOverdue(false);
    setIsSubmitting(false);
  }, [accounts, draftId, editingId]);

  useEffect(() => {
    if (
      !editingId ||
      !plannedPayment ||
      hydratedPaymentIdRef.current === plannedPayment.id
    ) {
      return;
    }

    hydratedPaymentIdRef.current = plannedPayment.id;
    setType(plannedPayment.type);
    setAmount(formatAmountInput(plannedPayment.amount));
    setName(plannedPayment.name);
    setDescription(plannedPayment.description);
    setAccountId(plannedPayment.accountId);
    setCategory({
      color: plannedPayment.color,
      name: plannedPayment.category,
      symbol: plannedPayment.symbol,
    });
    setDate(new Date(plannedPayment.startDate).getTime());
    setFrequency(plannedPayment.frequency);
    setInterval(plannedPayment.interval);
    setTags(
      plannedPayment.tags.map((tag) => ({
        color: tag.color,
        id: tag.id,
        name: tag.name,
      }))
    );
    setNotifyOnDue(plannedPayment.notifyOnDue);
    setNotifyOnOverdue(plannedPayment.notifyOnOverdue);
    setIsSubmitting(false);
  }, [editingId, plannedPayment]);

  const submit = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const amountMinorUnits = amountInputToMinorUnits(amount);
    if (amountMinorUnits <= 0) {
      Alert.alert(
        "Missing amount",
        "Enter a planned payment amount to continue."
      );
      return;
    }
    if (!name.trim()) {
      Alert.alert("Missing name", "Enter a name for this planned payment.");
      return;
    }
    if (!accountId) {
      Alert.alert(
        "Missing account",
        "Choose an account for this planned payment."
      );
      return;
    }
    if (!category) {
      Alert.alert(
        "Missing category",
        "Choose a category for this planned payment."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        accountId: accountId as Id<"accounts">,
        amount: amountMinorUnits,
        category: category.name,
        categoryColor: category.color,
        categorySymbol: category.symbol,
        description,
        frequency,
        interval: Math.max(1, Math.round(interval)),
        name,
        notifyOnDue,
        notifyOnOverdue,
        startDate: date,
        tagIds: tags.map((tag) => tag.id as Id<"tags">),
        type,
      };

      if (editingId) {
        await updatePlannedPayment({
          id: editingId as Id<"plannedPayments">,
          ...payload,
        });
      } else {
        await createPlannedPayment(payload);
      }
      closePlannedPaymentForm();
    } catch (error) {
      Alert.alert(
        "Could not save planned payment",
        error instanceof Error ? error.message : "Please try again."
      );
      setIsSubmitting(false);
    }
  }, [
    accountId,
    amount,
    category,
    createPlannedPayment,
    date,
    description,
    editingId,
    frequency,
    interval,
    isSubmitting,
    name,
    notifyOnDue,
    notifyOnOverdue,
    tags,
    type,
    updatePlannedPayment,
  ]);

  const value = useMemo(
    () => ({
      accountId,
      amount,
      category,
      date,
      description,
      frequency,
      interval,
      isEditing: editingId !== null,
      isSubmitting,
      name,
      notifyOnDue,
      notifyOnOverdue,
      setAccountId,
      setAmount,
      setCategory,
      setDate,
      setDescription,
      setFrequency,
      setInterval,
      setName,
      setNotifyOnDue,
      setNotifyOnOverdue,
      setType,
      submit: () => {
        void submit();
      },
      tags,
      toggleTag: (tag: PlannedTagSelection) => {
        setTags((current) =>
          current.some((item) => item.id === tag.id)
            ? current.filter((item) => item.id !== tag.id)
            : [...current, tag]
        );
      },
      type,
    }),
    [
      accountId,
      amount,
      category,
      date,
      description,
      editingId,
      frequency,
      interval,
      isSubmitting,
      name,
      notifyOnDue,
      notifyOnOverdue,
      tags,
      submit,
      type,
    ]
  );

  if (editingId && plannedPayment === undefined) {
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
    <AddPlannedPaymentContext.Provider value={value}>
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
            title: editingId ? "Edit planned payment" : "New planned payment",
          }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Close"
              icon="xmark"
              onPress={closePlannedPaymentForm}
              separateBackground
            />
          </Stack.Toolbar>
          <Stack.Toolbar placement="right">
            {isSubmitting ? (
              <Stack.Toolbar.View>
                <ActivityIndicator />
              </Stack.Toolbar.View>
            ) : (
              <Stack.Toolbar.Button
                accessibilityLabel="Save planned payment"
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
              onPress={() =>
                router.push("/add-planned-payment/tag-new" as never)
              }
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
    </AddPlannedPaymentContext.Provider>
  );
}
