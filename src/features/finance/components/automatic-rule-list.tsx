import { Pressable, View } from "react-native";

import { Icon as SymbolView } from "@/components/icon";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { cn } from "@/lib/cn";

import type { AutomaticRule } from "../types";

interface Props {
  emptyText?: string;
  onPressRule: (rule: AutomaticRule) => void;
  rules: AutomaticRule[];
}

const actionSummary = (rule: AutomaticRule): string => {
  const actions = [
    rule.category?.name,
    ...rule.tags.map((tag) => tag.name),
  ].filter((value): value is string => Boolean(value));
  return actions.join(" • ");
};

const AutomaticRuleRow = ({
  onPress,
  rule,
}: {
  onPress: () => void;
  rule: AutomaticRule;
}) => {
  const color = rule.category?.color ?? rule.tags[0]?.color ?? "#8E8E93";
  const symbol = rule.category?.symbol ?? "wand.and.stars";

  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-3"
      onPress={onPress}
    >
      <View
        className="size-[42px] shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: color }}
      >
        <SymbolView name={symbol as never} size={18} tintColor="#fff" />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <ThemedText
            type="smallBold"
            numberOfLines={1}
            className="flex-1 text-base leading-[22px]"
          >
            {rule.name}
          </ThemedText>
          <ThemedText
            type="smallBold"
            color={rule.type === "income" ? "positive" : "negative"}
            className="text-[13px] capitalize"
          >
            {rule.type}
          </ThemedText>
        </View>
        <ThemedText
          type="small"
          color="muted"
          numberOfLines={1}
          className="text-[15px] leading-[21px]"
        >
          Description contains “{rule.matchText}”
        </ThemedText>
        <ThemedText
          type="small"
          color="muted"
          numberOfLines={1}
          className="text-[14px] italic leading-5"
        >
          {actionSummary(rule)}
        </ThemedText>
      </View>
      <SymbolView name="chevron.right" size={12} tintColor="#8E8E93" />
    </Pressable>
  );
};

export const AutomaticRuleList = ({
  emptyText = "No automatic rules found",
  onPressRule,
  rules,
}: Props) => {
  if (rules.length === 0) {
    return (
      <ThemedView
        variant="card"
        className="items-center rounded-[22px] px-4 py-7"
      >
        <View className="mb-3 size-11 items-center justify-center rounded-full bg-background">
          <SymbolView name="wand.and.stars" size={22} tintColor="#8E8E93" />
        </View>
        <ThemedText type="small" color="muted" className="text-center">
          {emptyText}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView variant="card" className="rounded-[22px] p-4">
      {rules.map((rule, index) => (
        <View key={rule.id} className={cn(index < rules.length - 1 && "mb-4")}>
          <AutomaticRuleRow onPress={() => onPressRule(rule)} rule={rule} />
        </View>
      ))}
    </ThemedView>
  );
};
