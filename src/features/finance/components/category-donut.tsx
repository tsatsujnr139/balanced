import { View } from "react-native";
import { Pie, PolarChart } from "victory-native";

import { ThemedText } from "@/components/themed-text";

import type { SpendingGroup } from "../use-stats";

const DONUT_SIZE = 220;

interface Props {
  groups: SpendingGroup[];
  transactionCount: number;
}

export function CategoryDonut({ groups, transactionCount }: Props) {
  // Anonymous object type (not a named interface) so it satisfies the
  // Record<string, unknown> constraint Victory's PolarChart requires.
  const data = groups.map((group) => ({
    color: group.color,
    label: group.label,
    value: group.amount,
  }));

  return (
    <View style={{ height: DONUT_SIZE, width: "100%" }}>
      <PolarChart
        colorKey="color"
        data={data}
        labelKey="label"
        valueKey="value"
      >
        <Pie.Chart innerRadius="64%" />
      </PolarChart>
      <View
        className="absolute inset-0 items-center justify-center"
        pointerEvents="none"
      >
        <ThemedText type="subtitle" className="text-[30px] leading-[34px]">
          {transactionCount}
        </ThemedText>
        <ThemedText type="small" color="muted">
          {transactionCount === 1 ? "transaction" : "transactions"}
        </ThemedText>
      </View>
    </View>
  );
}
