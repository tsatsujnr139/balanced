import { router } from "expo-router";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";

import { ThemedView } from "@/components/themed-view";
import { useCachedTags } from "@/features/finance/use-labels";
import { useThemeColors } from "@/hooks/use-theme";

import { ColorLeading } from "./label-form-leads";

export interface TagPickerItem {
  color: string;
  id: string;
  name: string;
}

interface Props {
  newTagPathname: string;
  selectedTags: TagPickerItem[];
  toggleTag: (tag: TagPickerItem) => void;
}

export function TagPickerScreen({
  newTagPathname,
  selectedTags,
  toggleTag,
}: Props) {
  const colors = useThemeColors();
  const { isLoading, tags: availableTags } = useCachedTags();
  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim();
  const tags = useMemo(() => {
    const query = trimmedSearch.toLowerCase();
    return availableTags
      .filter((tag) => !query || tag.name.toLowerCase().includes(query))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [availableTags, trimmedSearch]);
  const hasExactMatch = availableTags.some(
    (tag) => tag.name.toLowerCase() === trimmedSearch.toLowerCase()
  );

  return (
    <>
      <Stack.SearchBar
        autoCapitalize="none"
        onCancelButtonPress={() => setSearch("")}
        onChangeText={(event) => setSearch(event.nativeEvent.text)}
        placeholder="Search tags"
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 40,
          paddingHorizontal: 20,
        }}
        data={tags}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          trimmedSearch && !hasExactMatch ? (
            <ThemedView
              variant="card"
              className="mb-3 overflow-hidden rounded-[22px]"
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  router.push({
                    params: { name: trimmedSearch },
                    pathname: newTagPathname as never,
                  });
                }}
                style={{
                  justifyContent: "center",
                  minHeight: 58,
                  paddingHorizontal: 16,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 17,
                    fontWeight: "600",
                  }}
                >
                  Add "{trimmedSearch}"
                </Text>
              </Pressable>
            </ThemedView>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View
              style={{
                alignItems: "center",
                flex: 1,
                justifyContent: "center",
                padding: 32,
              }}
            >
              <ActivityIndicator />
            </View>
          ) : (
            <View
              style={{
                alignItems: "center",
                flex: 1,
                gap: 14,
                justifyContent: "center",
                padding: 32,
              }}
            >
              <SymbolView name="tag" size={32} tintColor={colors.muted} />
              <Text style={{ color: colors.muted, fontSize: 17 }}>
                {availableTags.length === 0 && !trimmedSearch
                  ? "No tags yet"
                  : "No tags found"}
              </Text>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const selected = selectedTags.some((tag) => tag.id === item.id);
          return (
            <View
              style={{
                backgroundColor: colors.card,
                borderBottomLeftRadius: index === tags.length - 1 ? 22 : 0,
                borderBottomRightRadius: index === tags.length - 1 ? 22 : 0,
                borderTopLeftRadius: index === 0 ? 22 : 0,
                borderTopRightRadius: index === 0 ? 22 : 0,
                overflow: "hidden",
              }}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => toggleTag(item)}
              >
                <View
                  style={{
                    alignItems: "center",
                    flexDirection: "row",
                    gap: 14,
                    minHeight: 62,
                    paddingLeft: 16,
                  }}
                >
                  <ColorLeading color={item.color} />
                  <View
                    style={{
                      alignItems: "center",
                      borderBottomColor: colors.border,
                      borderBottomWidth: index === tags.length - 1 ? 0 : 1,
                      flex: 1,
                      flexDirection: "row",
                      minHeight: 62,
                      paddingRight: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.foreground,
                        flex: 1,
                        fontSize: 17,
                      }}
                    >
                      {item.name}
                    </Text>
                    {selected ? (
                      <SymbolView
                        name="checkmark"
                        size={18}
                        tintColor={colors.primary}
                      />
                    ) : null}
                  </View>
                </View>
              </Pressable>
            </View>
          );
        }}
        style={{ backgroundColor: colors.background, flex: 1 }}
      />
    </>
  );
}
