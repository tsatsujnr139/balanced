import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";

import { Icon as SymbolView } from "@/components/icon";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAddAutomaticRule } from "@/features/finance/add-automatic-rule-context";
import {
  FieldGroup,
  FieldRow,
  FieldSectionLabel,
} from "@/features/finance/components/form-fields";
import { useThemeColors } from "@/hooks/use-theme";

const RULE_TYPES = ["Expense", "Income"];

const closeRuleForm = (): void => {
  if (router.canDismiss()) {
    router.dismiss();
    return;
  }
  router.replace("/automatic-rules" as never);
};

const tagsLabel = (tags: { name: string }[]): string => {
  if (tags.length === 0) {
    return "None";
  }
  if (tags.length === 1) {
    return tags[0].name;
  }
  return `${tags.length} tags`;
};

export default function AddAutomaticRuleScreen() {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const editingId = Array.isArray(id) ? id[0] : id;
  const deleteRule = useMutation(api.automaticRules.remove);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    addMatchText,
    category,
    isLoadingExisting,
    isSubmitting,
    matchTextInput,
    matchTexts,
    name,
    removeMatchText,
    setCategory,
    setMatchTextInput,
    setName,
    setType,
    tags,
    type,
  } = useAddAutomaticRule();

  const confirmDelete = useCallback(() => {
    if (!editingId || isDeleting || isSubmitting) {
      return;
    }
    Alert.alert(
      "Delete automatic rule?",
      "This rule will be permanently deleted.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteRule({
                id: editingId as Id<"automaticRules">,
              });
              closeRuleForm();
            } catch (error) {
              Alert.alert(
                "Could not delete rule",
                error instanceof Error ? error.message : "Please try again."
              );
              setIsDeleting(false);
            }
          },
          style: "destructive",
          text: "Delete",
        },
      ]
    );
  }, [deleteRule, editingId, isDeleting, isSubmitting]);

  if (isLoadingExisting) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.background,
          flex: 1,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        gap: 18,
        paddingBottom: 40,
        paddingHorizontal: 20,
      }}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: colors.background, flex: 1 }}
    >
      <SegmentedControl
        appearance={colorScheme === "dark" ? "dark" : "light"}
        onChange={(event) => {
          setType(
            event.nativeEvent.selectedSegmentIndex === 1 ? "income" : "expense"
          );
        }}
        selectedIndex={type === "income" ? 1 : 0}
        style={{ width: "100%" }}
        values={RULE_TYPES}
      />

      <View>
        <FieldSectionLabel>Rule</FieldSectionLabel>
        <FieldGroup>
          <View style={{ minHeight: 62, paddingHorizontal: 18 }}>
            <TextInput
              accessibilityLabel="Rule name"
              maxLength={80}
              onChangeText={setName}
              placeholder="Rule name"
              placeholderTextColor={colors.muted}
              style={{ color: colors.foreground, flex: 1, fontSize: 17 }}
              value={name}
            />
          </View>
          <View
            style={{
              borderTopColor: colors.border,
              borderTopWidth: 1,
              minHeight: 62,
              paddingHorizontal: 18,
              paddingVertical: 10,
            }}
          >
            <TextInput
              accessibilityHint="Press Done to add this match text"
              accessibilityLabel="Add description match text"
              autoCapitalize="none"
              autoCorrect={false}
              enablesReturnKeyAutomatically
              maxLength={120}
              onChangeText={setMatchTextInput}
              onSubmitEditing={(event) => {
                addMatchText(event.nativeEvent.text);
              }}
              placeholder="Add a word or phrase"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              style={{
                color: colors.foreground,
                fontSize: 17,
                minHeight: 42,
              }}
              submitBehavior="submit"
              value={matchTextInput}
            />
            {matchTexts.length > 0 ? (
              <View
                accessibilityLabel="Description match texts"
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  paddingBottom: 4,
                  paddingTop: 6,
                }}
              >
                {matchTexts.map((matchText) => (
                  <Pressable
                    accessibilityLabel={`Remove ${matchText}`}
                    accessibilityRole="button"
                    key={matchText.toLocaleLowerCase()}
                    onPress={() => removeMatchText(matchText)}
                    style={({ pressed }) => ({
                      alignItems: "center",
                      backgroundColor: colors.selected,
                      borderCurve: "continuous",
                      borderRadius: 999,
                      flexDirection: "row",
                      gap: 6,
                      opacity: pressed ? 0.65 : 1,
                      paddingHorizontal: 11,
                      paddingVertical: 7,
                    })}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {matchText}
                    </Text>
                    <SymbolView
                      name="xmark"
                      size={10}
                      tintColor={colors.muted}
                    />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </FieldGroup>
        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            lineHeight: 18,
            paddingHorizontal: 5,
            paddingTop: 8,
          }}
        >
          Press Done after each word or phrase. Matching any badge ignores
          capitalization and can fill a missing category or add tags when none
          are selected.
        </Text>
      </View>

      <View>
        <FieldSectionLabel>Apply</FieldSectionLabel>
        <FieldGroup>
          <FieldRow
            icon={category?.symbol ?? "square.grid.2x2.fill"}
            iconColor={category?.color ?? "#8E8E93"}
            label="Category"
            onPress={() => router.push("/add-automatic-rule/category" as never)}
            value={category?.name ?? "None"}
          />
          <FieldRow
            icon="tag"
            iconColor="#5856D6"
            label="Tags"
            last
            onPress={() => router.push("/add-automatic-rule/tags" as never)}
            value={tagsLabel(tags)}
          />
        </FieldGroup>
        {category ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setCategory(null)}
            style={({ pressed }) => ({
              alignSelf: "flex-end",
              opacity: pressed ? 0.6 : 1,
              paddingHorizontal: 5,
              paddingTop: 9,
            })}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              Remove category action
            </Text>
          </Pressable>
        ) : null}
      </View>

      {editingId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete automatic rule"
          disabled={isDeleting || isSubmitting}
          onPress={confirmDelete}
          style={({ pressed }) => ({
            alignItems: "center",
            borderCurve: "continuous",
            borderRadius: 18,
            justifyContent: "center",
            minHeight: 56,
            opacity: pressed || isDeleting || isSubmitting ? 0.6 : 1,
          })}
        >
          {isDeleting ? (
            <ActivityIndicator color={colors.negative} />
          ) : (
            <View
              style={{ alignItems: "center", flexDirection: "row", gap: 8 }}
            >
              <SymbolView name="trash" size={18} tintColor={colors.negative} />
              <Text
                style={{
                  color: colors.negative,
                  fontSize: 17,
                  fontWeight: "600",
                }}
              >
                Delete
              </Text>
            </View>
          )}
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
