import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";

import { HeaderIconButton } from "@/components/header-icon-button";
import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { MaterialIcons } from "@/constants/material-icons";
import type { TagDraft } from "@/features/finance/add-tag-context";
import { AddTagContext } from "@/features/finance/add-tag-context";
import {
  DEFAULT_LABEL_COLOR,
  pickRandomColor,
} from "@/features/finance/color-utils";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

export default function AddTagLayout() {
  const colors = useThemeColors();
  const disableHeaderBlur = shouldDisableHeaderBlur();
  const [draft, setDraft] = useState<TagDraft>(() => ({
    color: pickRandomColor() ?? DEFAULT_LABEL_COLOR,
    name: "",
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
    <AddTagContext.Provider value={value}>
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
            title: "Add tag",
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
    </AddTagContext.Provider>
  );
}
