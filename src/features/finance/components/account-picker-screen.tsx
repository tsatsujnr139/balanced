import { SymbolView } from "expo-symbols";
import { FlatList, Pressable, Text, View } from "react-native";

import type { Account } from "@/features/finance/types";
import { useThemeColors } from "@/hooks/use-theme";

import { CategoryLeading } from "./label-form-leads";

interface Props {
  accounts: Account[];
  onSelectAccount: (account: Account) => void;
  selectedAccountId: string | null;
}

export function AccountPickerScreen({
  accounts,
  onSelectAccount,
  selectedAccountId,
}: Props) {
  const colors = useThemeColors();

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
      data={accounts}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => {
        const selected = item.id === selectedAccountId;
        return (
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: index === 0 ? 22 : 0,
              borderTopRightRadius: index === 0 ? 22 : 0,
              borderBottomLeftRadius: index === accounts.length - 1 ? 22 : 0,
              borderBottomRightRadius: index === accounts.length - 1 ? 22 : 0,
              overflow: "hidden",
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onSelectAccount(item);
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  gap: 14,
                  minHeight: 62,
                  paddingLeft: 16,
                }}
              >
                <CategoryLeading color={item.color} symbol={item.symbol} />
                <View
                  style={{
                    alignItems: "center",
                    borderBottomColor: colors.border,
                    borderBottomWidth: index === accounts.length - 1 ? 0 : 1,
                    flex: 1,
                    flexDirection: "row",
                    minHeight: 62,
                    paddingRight: 16,
                  }}
                >
                  <Text
                    style={{ color: colors.foreground, flex: 1, fontSize: 17 }}
                  >
                    {item.name}
                  </Text>
                  {selected ? (
                    <SymbolView
                      name="checkmark"
                      size={18}
                      tintColor={colors.primary}
                    />
                  ) : null}
                </View>
              </View>
            </Pressable>
          </View>
        );
      }}
      style={{ backgroundColor: colors.background, flex: 1 }}
    />
  );
}
