import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useAddAccountSubmit } from "@/features/finance/add-account-submit-context";
import type { AccountBalanceUpdateMode } from "@/features/finance/add-account-submit-context";
import { FieldGroup } from "@/features/finance/components/form-fields";
import { getCurrencySymbol } from "@/features/finance/format";
import { useThemeColors } from "@/hooks/use-theme";

const BALANCE_UPDATE_OPTIONS: {
  description: string;
  label: string;
  mode: AccountBalanceUpdateMode;
}[] = [
  {
    description: "Creates an income or expense transaction for the difference.",
    label: "Adjust by record",
    mode: "record",
  },
  {
    description: "Changes the stored balance without adding a transaction.",
    label: "Edit initial balance",
    mode: "initial",
  },
];

export default function AccountBalanceScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const isEditing = Boolean(
    Array.isArray(params.id) ? params.id[0] : params.id
  );
  const {
    balanceInput,
    balanceUpdateMode,
    currency,
    setBalanceInput,
    setBalanceUpdateMode,
  } = useAddAccountSubmit();
  const currencySymbol = getCurrencySymbol(currency);
  const [balance, setBalance] = useState(
    balanceInput === "0.00" ? "" : balanceInput
  );
  const [mode, setMode] = useState<AccountBalanceUpdateMode>(balanceUpdateMode);

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
      <Stack.Screen>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            accessibilityLabel="Done"
            icon="checkmark"
            onPress={() => {
              setBalanceInput(balance.trim() || "0.00");
              setBalanceUpdateMode(mode);
              router.back();
            }}
            tintColor={colors.primary}
            variant="prominent"
          />
        </Stack.Toolbar>
      </Stack.Screen>
      <View>
        <FieldGroup>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              gap: 8,
              minHeight: 72,
              paddingHorizontal: 18,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: currencySymbol.length > 2 ? 22 : 28,
                fontWeight: "600",
              }}
            >
              {currencySymbol}
            </Text>
            <TextInput
              autoFocus
              keyboardType="decimal-pad"
              onChangeText={setBalance}
              placeholder=""
              placeholderTextColor={colors.muted}
              style={{
                color: colors.foreground,
                flex: 1,
                fontSize: 34,
                fontWeight: "700",
              }}
              value={balance}
            />
          </View>
        </FieldGroup>
      </View>
      {isEditing ? (
        <View>
          <FieldGroup>
            {BALANCE_UPDATE_OPTIONS.map((option, index) => {
              const selected = option.mode === mode;

              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={option.mode}
                  onPress={() => setMode(option.mode)}
                >
                  <View
                    style={{
                      alignItems: "center",
                      flexDirection: "row",
                      gap: 12,
                      minHeight: 72,
                      paddingLeft: 18,
                    }}
                  >
                    <View
                      style={{
                        alignItems: "center",
                        borderColor: selected ? colors.primary : colors.border,
                        borderRadius: 11,
                        borderWidth: 2,
                        height: 22,
                        justifyContent: "center",
                        width: 22,
                      }}
                    >
                      {selected ? (
                        <View
                          style={{
                            backgroundColor: colors.primary,
                            borderRadius: 5,
                            height: 10,
                            width: 10,
                          }}
                        />
                      ) : null}
                    </View>
                    <View
                      style={{
                        borderBottomColor: colors.border,
                        borderBottomWidth:
                          index === BALANCE_UPDATE_OPTIONS.length - 1 ? 0 : 1,
                        flex: 1,
                        justifyContent: "center",
                        minHeight: 72,
                        paddingRight: 18,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.foreground,
                          fontSize: 17,
                          fontWeight: "500",
                        }}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={{
                          color: colors.muted,
                          fontSize: 13,
                          marginTop: 2,
                        }}
                      >
                        {option.description}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </FieldGroup>
        </View>
      ) : null}
    </ScrollView>
  );
}
