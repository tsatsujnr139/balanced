import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { FlatList, Pressable, Text, View } from "react-native";

import { useAddTemplate } from "@/features/finance/add-template-context";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

export default function TemplateAccountScreen() {
  const colors = useThemeColors();
  const { field } = useLocalSearchParams<{ field?: string | string[] }>();
  const accountField = Array.isArray(field) ? field[0] : field;
  const { accounts } = useFinance();
  const { accountId, setAccountId, setToAccountId, toAccountId } =
    useAddTemplate();
  const selectedAccountId = accountField === "to" ? toAccountId : accountId;
  const accountOptions =
    accountField === "to"
      ? accounts.filter((account) => account.id !== accountId)
      : accounts;
  const title =
    accountField === "to"
      ? "To Account"
      : accountField === "from"
        ? "From Account"
        : "Account";

  return (
    <>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
        data={accountOptions}
        keyExtractor={(account) => account.id}
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (accountField === "to") {
                setToAccountId(item.id);
              } else {
                setAccountId(item.id);
                if (toAccountId === item.id) {
                  setToAccountId(null);
                }
              }
              router.back();
            }}
          >
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                gap: 14,
                minHeight: 62,
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: item.color,
                  borderRadius: 10,
                  height: 34,
                  justifyContent: "center",
                  width: 34,
                }}
              >
                <SymbolView
                  name={item.symbol as never}
                  size={17}
                  tintColor="#fff"
                />
              </View>
              <View
                style={{
                  alignItems: "center",
                  borderBottomColor: colors.border,
                  borderBottomWidth:
                    index === accountOptions.length - 1 ? 0 : 1,
                  flex: 1,
                  flexDirection: "row",
                  minHeight: 62,
                }}
              >
                <Text
                  style={{ color: colors.foreground, flex: 1, fontSize: 17 }}
                >
                  {item.name}
                </Text>
                {item.id === selectedAccountId ? (
                  <SymbolView
                    name="checkmark"
                    size={18}
                    tintColor={colors.primary}
                  />
                ) : null}
              </View>
            </View>
          </Pressable>
        )}
        style={{ backgroundColor: colors.background, flex: 1 }}
      />
      <Stack.Screen.Title>{title}</Stack.Screen.Title>
    </>
  );
}
