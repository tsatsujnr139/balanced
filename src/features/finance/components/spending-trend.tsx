import { matchFont, Text as SkiaText } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { View } from "react-native";
import { Bar, CartesianChart, useChartPressState } from "victory-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColors } from "@/hooks/use-theme";

import {
  formatCompactCurrency,
  formatCurrency,
  getCurrencySymbol,
} from "../format";
import type { TrendBucket } from "../use-stats";

const CHART_HEIGHT = 190;
const CHART_LABEL_FONT_SIZE = 11;
const CHART_AMOUNT_LABEL_FONT_SIZE = 9;
const CHART_AMOUNT_LABEL_AREA = 16;
const COMPACT_AXIS_AMOUNT_THRESHOLD = 100_000;
const CHART_PRESS_DELAY_MS = 100;
const CHART_SCROLL_FAIL_OFFSET_Y: [number, number] = [-8, 8];
const WEEKLY_TICK_COUNT = 7;
const YEARLY_TICK_COUNT = 12;

function formatAxisAmount(value: number, currency: string): string {
  const minorUnits = Math.round(value * 100);
  const symbol = getCurrencySymbol(currency).replace("GH₵", "₵");
  if (Math.abs(minorUnits) >= COMPACT_AXIS_AMOUNT_THRESHOLD) {
    return formatCompactCurrency(minorUnits, currency).replace("GH₵", "₵");
  }
  return `${symbol}${Math.round(Math.abs(value)).toLocaleString("en-GH")}`;
}

function getXAxisTickValues(bucketCount: number): number[] {
  if (bucketCount <= 1) {
    return [0];
  }
  if (bucketCount <= WEEKLY_TICK_COUNT) {
    return Array.from({ length: bucketCount }, (_, index) => index);
  }
  if (bucketCount === YEARLY_TICK_COUNT) {
    return [0, 3, 6, 9, 11];
  }

  const lastIndex = bucketCount - 1;
  return [
    0,
    Math.round(lastIndex * 0.25),
    Math.round(lastIndex * 0.5),
    Math.round(lastIndex * 0.75),
    lastIndex,
  ];
}

interface Props {
  trend: TrendBucket[];
  currency: string;
  average: number;
  projected: number | null;
  unit: "day" | "month";
}

export function SpendingTrend({
  trend,
  currency,
  average,
  projected,
  unit,
}: Props) {
  const colors = useThemeColors();
  const chartFont = useMemo(
    () => matchFont({ fontFamily: "System", fontSize: CHART_LABEL_FONT_SIZE }),
    []
  );
  const amountLabelFont = useMemo(
    () =>
      matchFont({
        fontFamily: "System",
        fontSize: CHART_AMOUNT_LABEL_FONT_SIZE,
      }),
    []
  );
  const { isActive, state: chartPressState } = useChartPressState({
    x: 0,
    y: { y: 0 },
  });
  const data = trend.map((bucket, index) => ({
    label: bucket.label,
    x: index,
    y: bucket.amount / 100,
  }));
  const xTickValues = getXAxisTickValues(trend.length);
  const hasData = trend.some((bucket) => bucket.amount > 0);
  const selectedBucket = isActive
    ? trend[chartPressState.matchedIndex.value]
    : undefined;

  return (
    <ThemedView variant="card" className="gap-4 rounded-[22px] p-4">
      <View className="flex-row justify-between">
        <View className="gap-1">
          <ThemedText type="small" color="muted">
            Avg / {unit}
          </ThemedText>
          <ThemedText type="smallBold" className="text-[16px]">
            {formatCurrency(average, currency)}
          </ThemedText>
        </View>
        {projected === null ? null : (
          <View className="items-end gap-1">
            <ThemedText type="small" color="muted">
              Projected
            </ThemedText>
            <ThemedText type="smallBold" className="text-[16px]">
              {formatCurrency(projected, currency)}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={{ height: CHART_HEIGHT }}>
        {hasData ? (
          <>
            <CartesianChart
              chartPressConfig={{
                pan: {
                  activateAfterLongPress: CHART_PRESS_DELAY_MS,
                  failOffsetY: CHART_SCROLL_FAIL_OFFSET_Y,
                },
              }}
              chartPressState={chartPressState}
              data={data}
              domainPadding={{ left: 10, right: 10, top: 14 }}
              padding={{
                bottom: 24,
                left: CHART_AMOUNT_LABEL_AREA,
                right: 14,
                top: 8,
              }}
              renderOutside={({ yScale, yTicks }) =>
                yTicks
                  .filter((tick) => tick > 0)
                  .map((tick) => (
                    <SkiaText
                      color={colors.muted}
                      font={amountLabelFont}
                      key={`amount-${tick}`}
                      text={formatAxisAmount(tick, currency)}
                      x={0}
                      y={yScale(tick) + CHART_AMOUNT_LABEL_FONT_SIZE / 3}
                    />
                  ))
              }
              xAxis={{
                font: chartFont,
                formatXLabel: (label) => trend[label]?.label ?? "",
                labelColor: colors.muted,
                lineColor: colors.border,
                tickValues: xTickValues,
              }}
              xKey="x"
              yAxis={[
                {
                  lineColor: colors.border,
                  tickCount: 3,
                },
              ]}
              yKeys={["y"]}
            >
              {({ points, chartBounds }) => (
                <Bar
                  chartBounds={chartBounds}
                  color={colors.primary}
                  points={points.y}
                  roundedCorners={{ topLeft: 4, topRight: 4 }}
                />
              )}
            </CartesianChart>
            {selectedBucket ? (
              <View className="absolute right-2 top-2 rounded-xl border border-border bg-card px-3 py-2 shadow-sm">
                <ThemedText type="small" color="muted">
                  {selectedBucket.label}
                </ThemedText>
                <ThemedText type="smallBold">
                  {formatCurrency(selectedBucket.amount, currency)}
                </ThemedText>
              </View>
            ) : null}
          </>
        ) : (
          <View className="flex-1 items-center justify-center">
            <ThemedText type="small" color="muted">
              No spending to chart
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}
