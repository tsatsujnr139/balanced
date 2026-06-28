import { useQuery } from "convex/react";
import { router } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";

import { useAddTransaction } from "@/features/finance/add-transaction-context";
import { TransactionTemplateList } from "@/features/finance/components/transaction-template-list";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../../convex/_generated/api";

export default function AddTransactionTemplatesScreen() {
  const colors = useThemeColors();
  const templates = useQuery(api.finance.listTransactionTemplates);
  const { applyTemplate } = useAddTransaction();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 18,
        paddingBottom: 40,
        paddingHorizontal: 20,
      }}
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      {templates === undefined ? (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            minHeight: 160,
          }}
        >
          <ActivityIndicator />
        </View>
      ) : (
        <TransactionTemplateList
          emptyText="No templates yet"
          templates={templates}
          onPressTemplate={(template) => {
            applyTemplate(template);
            router.back();
          }}
        />
      )}
    </ScrollView>
  );
}
