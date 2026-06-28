import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { cn } from "@/lib/cn";

import { formatCurrency } from "../format";
import type { TransactionTemplate } from "../types";

interface Props {
  templates: TransactionTemplate[];
  emptyText?: string;
  onPressTemplate: (template: TransactionTemplate) => void;
}

function TemplateRow({
  onPress,
  template,
}: {
  onPress: () => void;
  template: TransactionTemplate;
}) {
  const amount =
    template.type === "income"
      ? template.amount
      : template.type === "transfer"
        ? 0
        : -template.amount;

  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-start gap-2.5"
      onPress={onPress}
    >
      <View
        className="size-[42px] shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: template.color }}
      >
        <SymbolView
          name={template.symbol as never}
          size={18}
          tintColor="#fff"
        />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <ThemedText
          type="smallBold"
          numberOfLines={1}
          className="text-base leading-[22px]"
        >
          {template.name}
        </ThemedText>
        <ThemedText
          type="small"
          color="muted"
          numberOfLines={1}
          className="text-[15px] leading-[21px]"
        >
          {template.type === "transfer" && template.toAccountName
            ? `${template.accountName} -> ${template.toAccountName}`
            : template.accountName}
        </ThemedText>
        <ThemedText
          type="small"
          color="muted"
          numberOfLines={1}
          className="text-[15px] italic leading-[21px]"
        >
          {template.category}
        </ThemedText>
      </View>
      <View className="shrink-0 items-end gap-1">
        {template.type === "transfer" ? (
          <ThemedText type="smallBold" className="text-base leading-[22px]">
            Transfer
          </ThemedText>
        ) : (
          <ThemedText
            type="smallBold"
            color={template.type === "income" ? "positive" : "negative"}
            className="text-base leading-[22px]"
          >
            {formatCurrency(amount, template.currency, { signed: true })}
          </ThemedText>
        )}
        {template.transactionCharge ? (
          <ThemedText
            type="small"
            color="negative"
            style={{ fontSize: 13, fontWeight: "600" }}
          >
            {formatCurrency(-template.transactionCharge, template.currency, {
              signed: true,
            })}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

export function TransactionTemplateList({
  emptyText = "No templates found",
  onPressTemplate,
  templates,
}: Props) {
  if (templates.length === 0) {
    return (
      <ThemedView
        variant="card"
        className="items-center rounded-[22px] px-4 py-7"
      >
        <View className="mb-3 size-11 items-center justify-center rounded-full bg-background">
          <SymbolView
            name="rectangle.stack.badge.plus"
            size={22}
            tintColor="#8E8E93"
          />
        </View>
        <ThemedText type="small" color="muted" className="text-center">
          {emptyText}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="card" className="rounded-[22px] p-4">
      {templates.map((template, index) => (
        <View
          key={template.id}
          className={cn(index < templates.length - 1 && "mb-4")}
        >
          <TemplateRow
            template={template}
            onPress={() => onPressTemplate(template)}
          />
        </View>
      ))}
    </ThemedView>
  );
}
