import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useMemo, useState } from "react";
import { Platform } from "react-native";

import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { AddCategoryContext } from "@/features/finance/add-category-context";
import type { TransactionLabelDraft } from "@/features/finance/add-transaction-context";
import {
  DEFAULT_LABEL_COLOR,
  pickRandomColor,
} from "@/features/finance/color-utils";

const DEFAULT_CATEGORY_SYMBOL = "square.grid.2x2.fill";

export default function AddCategoryLayout() {
  const disableHeaderBlur = shouldDisableHeaderBlur();
  const [draft, setDraft] = useState<TransactionLabelDraft>(() => ({
    color: pickRandomColor() ?? DEFAULT_LABEL_COLOR,
    name: "",
    symbol: DEFAULT_CATEGORY_SYMBOL,
  }));
  const value = useMemo(() => ({ draft, setDraft }), [draft]);

  return (
    <AddCategoryContext.Provider value={value}>
      <Stack
        screenOptions={{
          headerBlurEffect:
            Platform.OS === "ios"
              ? disableHeaderBlur
                ? "none"
                : "systemMaterial"
              : undefined,
          headerShadowVisible: false,
          headerTransparent: true,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ headerBackVisible: false, title: "Add category" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Close"
              icon="xmark"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="name"
          options={{ headerBackVisible: false, title: "Name" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="icon"
          options={{ headerBackVisible: false, title: "Icon" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
        <Stack.Screen
          name="color"
          options={{ headerBackVisible: false, title: "Color" }}
        >
          <Stack.Toolbar placement="left">
            <Stack.Toolbar.Button
              accessibilityLabel="Back"
              icon="chevron.left"
              onPress={() => router.back()}
              separateBackground
            />
          </Stack.Toolbar>
        </Stack.Screen>
      </Stack>
    </AddCategoryContext.Provider>
  );
}
