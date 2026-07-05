import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import { useAddPlannedPayment } from "@/features/finance/add-planned-payment-context";
import {
  DEFAULT_LABEL_COLOR,
  normalizeColorParam,
  pickRandomColor,
} from "@/features/finance/color-utils";
import { NewTagScreen } from "@/features/finance/components/new-tag-screen";

export default function PlannedPaymentNewTagScreen() {
  const params = useLocalSearchParams<{ color?: string }>();
  const [initialColor] = useState(() => pickRandomColor());
  const { setTagColorDraft, tagColorDraft, tags, toggleTag } =
    useAddPlannedPayment();

  useEffect(() => {
    setTagColorDraft(
      normalizeColorParam(params.color) ?? initialColor ?? DEFAULT_LABEL_COLOR
    );
  }, [initialColor, params.color, setTagColorDraft]);

  return (
    <NewTagScreen
      color={tagColorDraft}
      onColorPress={() =>
        router.push("/add-planned-payment/tag-color" as never)
      }
      selectedTags={tags}
      toggleTag={toggleTag}
    />
  );
}
