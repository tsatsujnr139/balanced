import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";

import { HeaderIconButton } from "@/components/header-icon-button";
import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { MaterialIcons } from "@/constants/material-icons";
import { AddCategoryContext } from "@/features/finance/add-category-context";
import type { TransactionLabelDraft } from "@/features/finance/add-transaction-context";
import {
  DEFAULT_LABEL_COLOR,
  pickRandomColor,
} from "@/features/finance/color-utils";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

const DEFAULT_CATEGORY_SYMBOL = "square.grid.2x2.fill";

export default function AddCategoryLayout() {
  const colors = useThemeColors();
  const disableHeaderBlur = shouldDisableHeaderBlur();
  const [draft, setDraft] = useState<TransactionLabelDraft>(() => ({
    color: pickRandomColor() ?? DEFAULT_LABEL_COLOR,
    name: "",
    symbol: DEFAULT_CATEGORY_SYMBOL,
  }));
  const value = useMemo(() => ({ draft, setDraft }), [draft]);

  const renderBackButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Back"
        icon={MaterialIcons.chevronLeft}
        onPress={() => router.back()}
      />
    ),
    []
  );

  const renderCloseButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Close"
        icon={MaterialIcons.close}
        onPress={() => router.back()}
      />
    ),
    []
  );

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
          headerStyle:
            Platform.OS === "android"
              ? { backgroundColor: colors.background }
              : undefined,
          headerTransparent: Platform.OS === "ios",
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderCloseButton }),
            title: "Add category",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Close"
                icon="xmark"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="name"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Name",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="icon"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Icon",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="color"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Color",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Back"
                icon="chevron.left"
                onPress={() => router.back()}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
      </Stack>
    </AddCategoryContext.Provider>
  );
}
