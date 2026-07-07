import { useMutation, useQuery } from "convex/react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert } from "react-native";

import { HeaderIconButton } from "@/components/header-icon-button";
import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { MaterialIcons } from "@/constants/material-icons";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PlannedPaymentSummaryContext } from "@/features/finance/planned-payment-summary-context";
import { useFinance } from "@/features/finance/use-finance";
import { useLocalProfile } from "@/features/finance/use-local-profile";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function minorUnitsToAmountInput(value: number): string {
  return (Math.abs(value) / 100).toFixed(2);
}

function amountInputToMinorUnits(value: string): number {
  const parsed = Number.parseFloat(value.replaceAll(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function closeSummary() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }

  router.back();
}

export default function PlannedPaymentSummaryLayout() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    dueDate?: string | string[];
    id?: string | string[];
  }>();
  const id = firstParam(params.id);
  const dueDateParam = firstParam(params.dueDate);
  const dueDate = dueDateParam ? Number(dueDateParam) : Number.NaN;
  const planned = useQuery(
    api.finance.getPlannedPayment,
    id ? { id: id as Id<"plannedPayments"> } : "skip"
  );
  const markPaid = useMutation(api.finance.markPlannedPaymentPaid);
  const { accounts } = useFinance();
  const { firstName } = useLocalProfile();
  const [accountId, setAccountIdState] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [transactionCharge, setTransactionCharge] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => Date.now());

  useEffect(() => {
    setPaymentDate(Date.now());
  }, [dueDate, id]);

  useEffect(() => {
    if (!planned) {
      return;
    }

    setAccountIdState((current) => current ?? planned.accountId);
    setAmount((current) => current || minorUnitsToAmountInput(planned.amount));
    setTransactionCharge(
      (current) =>
        current ||
        (planned.transactionCharge
          ? minorUnitsToAmountInput(planned.transactionCharge)
          : "")
    );
  }, [planned]);

  const submit = useCallback(async () => {
    const amountInMinorUnits = amountInputToMinorUnits(amount);
    const selectedAccount = accounts.find(
      (account) => account.id === accountId
    );

    if (!(id && planned && Number.isFinite(dueDate)) || isSubmitting) {
      return;
    }
    if (!(selectedAccount && amountInMinorUnits > 0)) {
      Alert.alert(
        "Missing payment details",
        "Enter an amount and choose an account."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await markPaid({
        accountId: selectedAccount.id as Id<"accounts">,
        amount: amountInMinorUnits,
        createdByName: firstName,
        dueDate,
        id: id as Id<"plannedPayments">,
        paymentDate,
        // Always sent for expenses so clearing the field removes the
        // payment's default charge for this occurrence.
        transactionCharge:
          planned.type === "expense"
            ? amountInputToMinorUnits(transactionCharge)
            : undefined,
      });
      closeSummary();
    } catch (error) {
      Alert.alert(
        "Could not confirm payment",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    accountId,
    accounts,
    amount,
    dueDate,
    firstName,
    id,
    isSubmitting,
    markPaid,
    paymentDate,
    planned,
    transactionCharge,
  ]);

  const contextValue = useMemo(
    () => ({
      accountId,
      amount,
      isSubmitting,
      paymentDate,
      setAccountId: setAccountIdState,
      setAmount,
      setPaymentDate,
      setTransactionCharge,
      submit,
      transactionCharge,
    }),
    [accountId, amount, isSubmitting, paymentDate, submit, transactionCharge]
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
        onPress={closeSummary}
      />
    ),
    []
  );

  const renderConfirmButton = useCallback(
    () =>
      isSubmitting || planned === undefined ? (
        <ActivityIndicator />
      ) : (
        <HeaderIconButton
          accessibilityLabel="Confirm payment"
          icon={MaterialIcons.check}
          onPress={() => {
            void submit();
          }}
          tintColor={colors.primary}
        />
      ),
    [isSubmitting, planned, submit, colors.primary]
  );

  return (
    <PlannedPaymentSummaryContext.Provider value={contextValue}>
      <Stack
        screenOptions={{
          headerBlurEffect:
            process.env.EXPO_OS === "ios"
              ? shouldDisableHeaderBlur()
                ? "none"
                : "systemMaterial"
              : undefined,
          headerShadowVisible: false,
          headerStyle:
            process.env.EXPO_OS === "android"
              ? { backgroundColor: colors.background }
              : undefined,
          headerTransparent: process.env.EXPO_OS === "ios",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({
              headerLeft: renderCloseButton,
              headerRight: renderConfirmButton,
            }),
            title: "Payment summary",
          }}
        >
          {process.env.EXPO_OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Close"
                icon="xmark"
                onPress={closeSummary}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
          {process.env.EXPO_OS === "ios" ? (
            <Stack.Toolbar placement="right">
              {isSubmitting || planned === undefined ? (
                <Stack.Toolbar.View>
                  <ActivityIndicator />
                </Stack.Toolbar.View>
              ) : (
                <Stack.Toolbar.Button
                  accessibilityLabel="Confirm payment"
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
          {process.env.EXPO_OS === "ios" ? (
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
    </PlannedPaymentSummaryContext.Provider>
  );
}
