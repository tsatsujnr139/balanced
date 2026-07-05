import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { useAddTransaction } from "@/features/finance/add-transaction-context";
import {
  DEFAULT_LABEL_COLOR,
  normalizeColorParam,
  pickRandomColor,
} from "@/features/finance/color-utils";
import { NewTagScreen } from "@/features/finance/components/new-tag-screen";

export default function TransactionNewTagScreen() {
  const params = useLocalSearchParams<{ color?: string }>();
  const [initialColor] = useState(() => pickRandomColor());
  const { setTagColorDraft, tagColorDraft, tags, toggleTag } =
    useAddTransaction();

  useEffect(() => {
    setTagColorDraft(
      normalizeColorParam(params.color) ?? initialColor ?? DEFAULT_LABEL_COLOR
    );
  }, [initialColor, params.color, setTagColorDraft]);

  return (
    <NewTagScreen
      color={tagColorDraft}
      onColorPress={() => router.push("/add-transaction/tag-color" as never)}
      selectedTags={tags}
      toggleTag={toggleTag}
    />
  );
}
