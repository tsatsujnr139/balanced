import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform } from "react-native";

import { HeaderIconButton } from "@/components/header-icon-button";
import { shouldDisableHeaderBlur } from "@/components/tab-stack-layout";
import { MaterialIcons } from "@/constants/material-icons";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { AddAutomaticRuleContext } from "@/features/finance/add-automatic-rule-context";
import {
  clearAutomaticRuleDraftPrefill,
  getAutomaticRuleDraftPrefill,
} from "@/features/finance/automatic-rule-draft-prefill";
import { DEFAULT_LABEL_COLOR } from "@/features/finance/color-utils";
import type { TransactionCategory } from "@/features/finance/transaction-categories";
import type {
  AutomaticRuleType,
  TransactionTag,
} from "@/features/finance/types";
import { useThemeColors } from "@/hooks/use-theme";
import { androidHeaderOptions } from "@/lib/android-header-options";

const closeRuleForm = (): void => {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  router.replace("/automatic-rules" as never);
};

export default function AddAutomaticRuleLayout() {
  const colors = useThemeColors();
  const disableHeaderBlur = shouldDisableHeaderBlur();
  const { draftId: draftIdParam, id } = useLocalSearchParams<{
    draftId?: string | string[];
    id?: string | string[];
  }>();
  const draftId = Array.isArray(draftIdParam) ? draftIdParam[0] : draftIdParam;
  const editingId = Array.isArray(id) ? id[0] : id;
  const initialDraftPrefillRef = useRef(
    !editingId && draftId ? getAutomaticRuleDraftPrefill(draftId) : undefined
  );
  const draftPrefill = initialDraftPrefillRef.current;
  const rule = useQuery(
    api.automaticRules.get,
    editingId ? { id: editingId as Id<"automaticRules"> } : "skip"
  );
  const createRule = useMutation(api.automaticRules.create);
  const updateRule = useMutation(api.automaticRules.update);
  const [category, setCategory] = useState<TransactionCategory | null>(
    draftPrefill?.category ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchText, setMatchText] = useState(draftPrefill?.matchText ?? "");
  const [name, setName] = useState(draftPrefill?.name ?? "");
  const [tagColorDraft, setTagColorDraft] = useState(DEFAULT_LABEL_COLOR);
  const [tags, setTags] = useState<TransactionTag[]>(draftPrefill?.tags ?? []);
  const [type, setType] = useState<AutomaticRuleType>(
    draftPrefill?.type ?? "expense"
  );
  const hydratedIdRef = useRef<string | null>(null);
  const isEditing = Boolean(editingId);
  const isLoadingExisting = isEditing && rule === undefined;

  useEffect(
    () => () => {
      if (draftId) {
        clearAutomaticRuleDraftPrefill(draftId);
      }
    },
    [draftId]
  );

  useEffect(() => {
    if (!editingId || !rule || hydratedIdRef.current === rule.id) {
      return;
    }
    hydratedIdRef.current = rule.id;
    setCategory(
      rule.category ? { ...rule.category, keywords: [] as const } : null
    );
    setMatchText(rule.matchText);
    setName(rule.name);
    setTags(rule.tags);
    setType(rule.type);
  }, [editingId, rule]);

  const toggleTag = useCallback((tag: TransactionTag) => {
    setTags((current) =>
      current.some((item) => item.id === tag.id)
        ? current.filter((item) => item.id !== tag.id)
        : [...current, tag]
    );
  }, []);

  const submit = useCallback(async () => {
    if (isSubmitting || isLoadingExisting) {
      return;
    }
    if (!name.trim()) {
      Alert.alert("Missing name", "Enter a rule name to continue.");
      return;
    }
    if (!matchText.trim()) {
      Alert.alert(
        "Missing match text",
        "Enter the description text this rule should match."
      );
      return;
    }
    if (!category && tags.length === 0) {
      Alert.alert(
        "Missing action",
        "Choose a category, at least one tag, or both."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category: category
          ? {
              color: category.color,
              name: category.name,
              symbol: category.symbol,
            }
          : undefined,
        matchText,
        name,
        tagIds: tags.map((tag) => tag.id as Id<"tags">),
        type,
      };
      if (editingId) {
        await updateRule({
          id: editingId as Id<"automaticRules">,
          ...payload,
        });
      } else {
        await createRule(payload);
      }
      closeRuleForm();
    } catch (error) {
      Alert.alert(
        "Could not save rule",
        error instanceof Error ? error.message : "Please try again."
      );
      setIsSubmitting(false);
    }
  }, [
    category,
    createRule,
    editingId,
    isLoadingExisting,
    isSubmitting,
    matchText,
    name,
    tags,
    type,
    updateRule,
  ]);

  const context = useMemo(
    () => ({
      category,
      isLoadingExisting,
      isSubmitting,
      matchText,
      name,
      setCategory,
      setMatchText,
      setName,
      setTagColorDraft,
      setType,
      submit: () => {
        void submit();
      },
      tagColorDraft,
      tags,
      toggleTag,
      type,
    }),
    [
      category,
      isLoadingExisting,
      isSubmitting,
      matchText,
      name,
      submit,
      tagColorDraft,
      tags,
      toggleTag,
      type,
    ]
  );

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
        onPress={closeRuleForm}
      />
    ),
    []
  );
  const renderSaveButton = useCallback(
    () =>
      isSubmitting || isLoadingExisting ? (
        <ActivityIndicator />
      ) : (
        <HeaderIconButton
          accessibilityLabel="Save automatic rule"
          icon={MaterialIcons.check}
          onPress={() => void submit()}
          tintColor={colors.primary}
        />
      ),
    [colors.primary, isLoadingExisting, isSubmitting, submit]
  );
  const renderAddCategoryButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Add category"
        icon={MaterialIcons.add}
        onPress={() => router.push("/add-category" as never)}
      />
    ),
    []
  );
  const renderAddTagButton = useCallback(
    () => (
      <HeaderIconButton
        accessibilityLabel="Add tag"
        icon={MaterialIcons.add}
        onPress={() => router.push("/add-automatic-rule/tag-new" as never)}
      />
    ),
    []
  );

  return (
    <AddAutomaticRuleContext.Provider value={context}>
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
            headerLargeTitle: false,
            ...androidHeaderOptions({
              headerLeft: renderCloseButton,
              headerRight: renderSaveButton,
            }),
            title: isEditing ? "Edit Rule" : "Add Rule",
          }}
        >
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="left">
              <Stack.Toolbar.Button
                accessibilityLabel="Close"
                icon="xmark"
                onPress={closeRuleForm}
                separateBackground
              />
            </Stack.Toolbar>
          ) : null}
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="right">
              {isSubmitting || isLoadingExisting ? (
                <Stack.Toolbar.View>
                  <ActivityIndicator />
                </Stack.Toolbar.View>
              ) : (
                <Stack.Toolbar.Button
                  accessibilityLabel="Save automatic rule"
                  icon="checkmark"
                  onPress={() => void submit()}
                  tintColor={colors.primary}
                  variant="prominent"
                />
              )}
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="category"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({
              headerLeft: renderBackButton,
              headerRight: renderAddCategoryButton,
            }),
            title: "Category",
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
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="right">
              <Stack.Toolbar.Button
                accessibilityLabel="Add category"
                icon="plus"
                onPress={() => router.push("/add-category" as never)}
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="tags"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({
              headerLeft: renderBackButton,
              headerRight: renderAddTagButton,
            }),
            title: "Tags",
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
          {Platform.OS === "ios" ? (
            <Stack.Toolbar placement="right">
              <Stack.Toolbar.Button
                accessibilityLabel="Add tag"
                onPress={() =>
                  router.push("/add-automatic-rule/tag-new" as never)
                }
              >
                Add
              </Stack.Toolbar.Button>
              <Stack.Toolbar.Button
                accessibilityLabel="Done"
                icon="checkmark"
                onPress={() => router.back()}
                tintColor={colors.primary}
                variant="prominent"
              />
            </Stack.Toolbar>
          ) : null}
        </Stack.Screen>
        <Stack.Screen
          name="tag-new"
          options={{
            headerBackVisible: false,
            ...androidHeaderOptions({ headerLeft: renderBackButton }),
            title: "Add tag",
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
          name="tag-color"
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
    </AddAutomaticRuleContext.Provider>
  );
}
