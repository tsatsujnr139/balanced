import { router } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useFinance } from "@/features/finance/use-finance";
import { useThemeColors } from "@/hooks/use-theme";

export default function AppTabs() {
  const colors = useThemeColors();
  const { plannedPaymentsOverdueCount } = useFinance();
  const plannedBadge =
    plannedPaymentsOverdueCount > 0
      ? plannedPaymentsOverdueCount > 99
        ? "99+"
        : String(plannedPaymentsOverdueCount)
      : undefined;

  return (
    <NativeTabs
      disableTransparentOnScrollEdge
      labelStyle={{ selected: { color: colors.primary } }}
      minimizeBehavior="onScrollDown"
      tintColor={colors.primary}
    >
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }}
          md="dashboard"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="planning">
        <NativeTabs.Trigger.Label>Planning</NativeTabs.Trigger.Label>
        {plannedBadge ? (
          <NativeTabs.Trigger.Badge>{plannedBadge}</NativeTabs.Trigger.Badge>
        ) : null}
        <NativeTabs.Trigger.Icon
          sf={{ default: "calendar", selected: "calendar" }}
          md="calendar_month"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="stats">
        <NativeTabs.Trigger.Label>Stats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "chart.pie", selected: "chart.pie.fill" }}
          md="pie_chart"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: "person.crop.circle",
            selected: "person.crop.circle.fill",
          }}
          md="person"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="add-action"
        role="search"
        disabled
        listeners={{
          tabPress: () => {
            router.push("/add-transaction");
          },
        }}
      >
        <NativeTabs.Trigger.Label hidden>
          Add transaction
        </NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus", selected: "plus" }}
          md="add"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
