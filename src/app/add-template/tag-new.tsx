import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { useAddTemplate } from "@/features/finance/add-template-context";
import {
  DEFAULT_LABEL_COLOR,
  normalizeColorParam,
  pickRandomColor,
} from "@/features/finance/color-utils";
import { NewTagScreen } from "@/features/finance/components/new-tag-screen";

export default function TemplateNewTagScreen() {
  const params = useLocalSearchParams<{ color?: string }>();
  const [initialColor] = useState(() => pickRandomColor());
  const { setTagColorDraft, tagColorDraft, tags, toggleTag } = useAddTemplate();

  useEffect(() => {
    setTagColorDraft(
      normalizeColorParam(params.color) ?? initialColor ?? DEFAULT_LABEL_COLOR
    );
  }, [initialColor, params.color, setTagColorDraft]);

  return (
    <NewTagScreen
      color={tagColorDraft}
      onColorPress={() => router.push("/add-template/tag-color" as never)}
      selectedTags={tags}
      toggleTag={toggleTag}
    />
  );
}
