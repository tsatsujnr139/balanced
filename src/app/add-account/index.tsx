import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  ACCOUNT_TYPE_LABEL,
  ACCOUNT_TYPE_SYMBOL,
} from "@/features/finance/account-constants";
import { useAddAccountSubmit } from "@/features/finance/add-account-submit-context";
import {
  FieldGroup,
  FieldRow,
} from "@/features/finance/components/form-fields";
import { getCurrencySymbol } from "@/features/finance/format";
import type { AccountType } from "@/features/finance/types";
import { useFinance } from "@/features/finance/use-finance";
import { useLocalProfile } from "@/features/finance/use-local-profile";
import { useThemeColors } from "@/hooks/use-theme";

function closeAddAccount() {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }

  router.replace("/dashboard");
}

function formatBalanceDisplay(minorUnits: number, currency: string): string {
  const value = Math.abs(minorUnits / 100);
  const formatted = new Intl.NumberFormat("en-GH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);

  return `${getCurrencySymbol(currency)} ${formatted}`;
}

function AccountNameLeading({ name, color }: { name: string; color: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || "A";

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: color,
        borderRadius: 17,
        height: 34,
        justifyContent: "center",
        width: 34,
      }}
    >
      <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
        {letter}
      </Text>
    </View>
  );
}

function ColorLeading({ color }: { color: string }) {
  return (
    <View
      style={{
        backgroundColor: color,
        borderRadius: 10,
        height: 34,
        width: 34,
      }}
    />
  );
}

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

function CalculatorLeading() {
  return (
    <View
      style={{
        alignItems: "center",
        height: 34,
        justifyContent: "center",
        width: 34,
      }}
    >
      <View
        style={{
          borderColor: "#8E8E93",
          borderRadius: 3,
          borderWidth: 1.5,
          height: 24,
          padding: 3,
          width: 24,
        }}
      >
        <View
          style={{
            borderColor: "#8E8E93",
            borderRadius: 1,
            borderWidth: 1,
            height: 5,
            marginBottom: 3,
          }}
        />
        <View style={{ flex: 1, flexDirection: "row", gap: 2 }}>
          {[0, 1, 2].map((column) => (
            <View key={column} style={{ flex: 1, gap: 2 }}>
              {[0, 1, 2].map((row) => (
                <View
                  key={row}
                  style={{
                    backgroundColor: "#8E8E93",
                    borderRadius: 1,
                    flex: 1,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function CoinStackLeading() {
  return (
    <View
      style={{
        alignItems: "center",
        height: 34,
        justifyContent: "center",
        width: 34,
      }}
    >
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={{
            backgroundColor: "#F7F8FC",
            borderColor: "#8E8E93",
            borderRadius: 12,
            borderWidth: 1.5,
            bottom: 8 + index * 5,
            height: 8,
            position: "absolute",
            width: 24,
          }}
        />
      ))}
    </View>
  );
}

function amountInputToMinorUnits(value: string): number {
  const sanitized = value.replaceAll(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(sanitized || "0");
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.round(parsed * 100);
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function AddAccountScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{
    draftId?: string;
    id?: string;
    name?: string;
    balance?: string;
    currency?: string;
    type?: AccountType;
    color?: string;
  }>();
  const id = firstParam(params.id);
  const { accounts } = useFinance();
  const { firstName } = useLocalProfile();
  const createAccount = useMutation(api.finance.createAccount);
  const deleteAccount = useMutation(api.finance.deleteAccount);
  const updateAccount = useMutation(api.finance.updateAccount);
  const {
    accountColor,
    balanceInput,
    balanceUpdateMode,
    currency,
    isSubmitting,
    name,
    registerSubmit,
    type,
  } = useAddAccountSubmit();
  const [isDeleting, setIsDeleting] = useState(false);
  const existingAccount = useMemo(
    () => (id ? accounts.find((account) => account.id === id) : undefined),
    [accounts, id]
  );
  const isEditing = Boolean(existingAccount);

  const balanceLabel = isEditing ? "Current balance" : "Opening balance";
  const balance = amountInputToMinorUnits(balanceInput);

  const openFormRoute = useCallback(
    (
      pathname:
        | "/add-account/name"
        | "/add-account/balance"
        | "/add-account/currency"
        | "/add-account/type"
        | "/add-account/color"
    ) => {
      router.push({ params: id ? { id } : undefined, pathname });
    },
    [id]
  );

  const openNameEditor = useCallback(() => {
    openFormRoute("/add-account/name");
  }, [openFormRoute]);

  const openBalanceEditor = useCallback(() => {
    openFormRoute("/add-account/balance");
  }, [openFormRoute]);

  const openTypePicker = useCallback(() => {
    openFormRoute("/add-account/type");
  }, [openFormRoute]);

  const openCurrencyPicker = useCallback(() => {
    openFormRoute("/add-account/currency");
  }, [openFormRoute]);

  const openColorPicker = useCallback(() => {
    openFormRoute("/add-account/color");
  }, [openFormRoute]);

  const saveAccount = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert(
        "Account name required",
        "Enter a name before saving this account."
      );
      return;
    }

    const payload = {
      balance,
      color: accountColor,
      currency,
      name: trimmedName,
      symbol: ACCOUNT_TYPE_SYMBOL[type],
      type,
    };

    try {
      if (existingAccount) {
        await updateAccount({
          id: existingAccount.id as Id<"accounts">,
          ...payload,
          balanceUpdateMode,
          createdByName: firstName,
        });
      } else {
        await createAccount(payload);
      }
      closeAddAccount();
    } catch (error) {
      Alert.alert(
        "Could not save account",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }, [
    accountColor,
    balance,
    balanceUpdateMode,
    createAccount,
    currency,
    existingAccount,
    firstName,
    isSubmitting,
    name,
    type,
    updateAccount,
  ]);

  const confirmDeleteAccount = useCallback(() => {
    if (!id || isDeleting) {
      return;
    }

    Alert.alert(
      "Delete account?",
      `“${name.trim() || "This account"}” will be permanently deleted. This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAccount({ id: id as Id<"accounts"> });
              router.dismissTo("/dashboard");
            } catch (error) {
              Alert.alert(
                "Could not delete account",
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
  }, [deleteAccount, id, isDeleting, name]);

  useEffect(() => {
    registerSubmit(saveAccount);

    return () => {
      registerSubmit(null);
    };
  }, [registerSubmit, saveAccount]);

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
      <View>
        <FieldGroup>
          <FieldRow
            label="Account name"
            leading={<AccountNameLeading name={name} color={accountColor} />}
            onPress={openNameEditor}
            value={name}
          />
          <FieldRow
            label={balanceLabel}
            leading={<CalculatorLeading />}
            onPress={openBalanceEditor}
            value={formatBalanceDisplay(balance, currency)}
          />
          <FieldRow
            label="Currency"
            value={getCurrencySymbol(currency)}
            leading={<CurrencySymbolLeading currency={currency} />}
            onPress={openCurrencyPicker}
          />
          <FieldRow
            label="Type"
            value={ACCOUNT_TYPE_LABEL[type]}
            leading={<CoinStackLeading />}
            onPress={openTypePicker}
          />
          <FieldRow
            label="Color"
            last
            leading={<ColorLeading color={accountColor} />}
            onPress={openColorPicker}
          />
        </FieldGroup>
      </View>
      {id ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          disabled={isDeleting}
          onPress={confirmDeleteAccount}
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
