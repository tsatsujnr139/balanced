import { router } from "expo-router";
import type { Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth } from "@/constants/theme";
import { useFinance } from "@/features/finance/use-finance";

const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 12;

interface PlanningCard {
  id: string;
  title: string;
  subtitle: string;
  symbol: string;
  color: string;
  badge?: number;
  href: Href;
}

function PlanningGridCard({
  card,
  width,
}: {
  card: PlanningCard;
  width: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={card.title}
      style={{ width }}
      onPress={() => {
        router.push(card.href);
      }}
    >
      <ThemedView
        variant="card"
        className="justify-between rounded-3xl p-4"
        style={{ height: width, width }}
      >
        <View className="flex-row items-start justify-between">
          <View
            className="size-12 items-center justify-center rounded-2xl"
            style={{ backgroundColor: card.color }}
          >
            <SymbolView
              name={card.symbol as never}
              size={24}
              tintColor="#fff"
            />
          </View>
          {card.badge && card.badge > 0 ? (
            <View
              className="min-w-6 items-center justify-center rounded-full px-1.5 py-0.5"
              style={{ backgroundColor: "#FF3B30" }}
            >
              <ThemedText
                type="smallBold"
                className="text-xs"
                style={{ color: "#fff" }}
              >
                {card.badge > 99 ? "99+" : card.badge}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <View className="gap-1">
          <ThemedText
            type="subtitle"
            numberOfLines={1}
            className="text-[20px] leading-6"
          >
            {card.title}
          </ThemedText>
          <ThemedText type="small" color="muted" numberOfLines={2}>
            {card.subtitle}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { plannedPaymentsOverdueCount } = useFinance();
  const contentWidth = Math.min(
    width - HORIZONTAL_PADDING * 2,
    MaxContentWidth
  );
  const cardWidth = (contentWidth - COLUMN_GAP) / 2;

  const cards: PlanningCard[] = [
    {
      badge: plannedPaymentsOverdueCount,
      color: "#FF9F0A",
      href: "/planned-payments",
      id: "planned-payments",
      subtitle: "Your future payments",
      symbol: "clock.fill",
      title: "Planned Payments",
    },
    {
      color: "#0A84FF",
      href: "/budgets",
      id: "budgets",
      subtitle: "Your spending plan",
      symbol: "dollarsign.circle.fill",
      title: "Budgets",
    },
    {
      color: "#34C759",
      href: "/templates",
      id: "templates",
      subtitle: "Reusable transactions",
      symbol: "rectangle.stack.fill",
      title: "Templates",
    },
  ];

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="items-center px-4"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingBottom: insets.bottom + BottomTabInset + 24,
      }}
    >
      <View className="w-full" style={{ maxWidth: MaxContentWidth }}>
        <View className="flex-row flex-wrap" style={{ gap: COLUMN_GAP }}>
          {cards.map((card) => (
            <PlanningGridCard key={card.id} card={card} width={cardWidth} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
