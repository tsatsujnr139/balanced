import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { FlatList, Pressable, Text, View } from "react-native";

import { useAddPlannedPayment } from "@/features/finance/add-planned-payment-context";
import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

export default function PlannedPaymentAccountScreen() {
  const colors = useThemeColors();
  const { accounts } = useFinance();
  const { accountId, setAccountId } = useAddPlannedPayment();

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
      data={accounts}
      keyExtractor={(account) => account.id}
      renderItem={({ item, index }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setAccountId(item.id);
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
                borderBottomWidth: index === accounts.length - 1 ? 0 : 1,
                flex: 1,
                flexDirection: "row",
                minHeight: 62,
              }}
            >
              <Text style={{ color: colors.foreground, flex: 1, fontSize: 17 }}>
                {item.name}
              </Text>
              {item.id === accountId ? (
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
  );
}
