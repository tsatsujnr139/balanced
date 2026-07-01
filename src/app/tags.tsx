import { useMutation } from "convex/react";
import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { useMemo, useState } from "react";
import { Alert, ScrollView } from "react-native";

import { LabelManagementList } from "@/features/finance/components/label-management-list";
import type { ManagedLabelItem } from "@/features/finance/components/label-management-list";
import { useCachedTags } from "@/features/finance/use-labels";
import { useThemeColors } from "@/hooks/use-theme";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export default function TagsScreen() {
  const colors = useThemeColors();
  const { isLoading, tags } = useCachedTags();
  const deleteTag = useMutation(api.finance.deleteTag);
  const [search, setSearch] = useState("");
  const items = useMemo<ManagedLabelItem[]>(() => {
    const query = search.trim().toLowerCase();
    return tags
      .filter((tag) => !query || tag.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((tag) => ({
        color: tag.color,
        deletable: true,
        id: tag.id,
        kind: "tag",
        name: tag.name,
      }));
  }, [search, tags]);

  const confirmDelete = (item: ManagedLabelItem) => {
    Alert.alert(
      "Delete tag?",
      `"${item.name}" will be permanently deleted.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: async () => {
            try {
              await deleteTag({ id: item.id as Id<"tags"> });
            } catch (error) {
              Alert.alert(
                "Could not delete tag",
                error instanceof Error ? error.message : "Please try again."
              );
            }
          },
          style: "destructive",
          text: "Delete",
        },
      ]
    );
  };

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          gap: 18,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        keyboardDismissMode="interactive"
        style={{ backgroundColor: colors.background, flex: 1 }}
      >
        <LabelManagementList
          emptyText={search.trim() ? "No tags found" : "No tags yet"}
          isLoading={isLoading}
          items={items}
          onDelete={confirmDelete}
        />
      </ScrollView>

      <Stack.Screen.BackButton displayMode="minimal" />
      <Stack.Screen.Title large>Tags</Stack.Screen.Title>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Add tag"
          icon="plus"
          onPress={() => {
            router.push("/add-tag" as never);
          }}
        />
      </Stack.Toolbar>
      <Stack.SearchBar
        autoCapitalize="none"
        onCancelButtonPress={() => setSearch("")}
        onChangeText={(event) => {
          setSearch(event.nativeEvent.text);
        }}
        placeholder="Search tags"
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
    </>
  );
}
