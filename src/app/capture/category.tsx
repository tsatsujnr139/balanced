import { router, useLocalSearchParams } from "expo-router";

import { useCapture } from "@/features/capture/capture-context";
import { CategoryPickerScreen } from "@/features/finance/components/category-picker-screen";

export default function CaptureCategoryScreen() {
  const { draft: draftParam } = useLocalSearchParams<{
    draft?: string | string[];
  }>();
  const draftKey = Array.isArray(draftParam) ? draftParam[0] : draftParam;
  const { drafts, setDraftCategory } = useCapture();
  const draft = drafts.find((item) => item.key === draftKey);

  return (
    <CategoryPickerScreen
      newCategoryPathname="/add-category"
      selectedCategoryName={draft?.category?.name ?? null}
      onSelectCategory={(category) => {
        if (draftKey) {
          setDraftCategory(draftKey, {
            color: category.color,
            name: category.name,
            symbol: category.symbol,
          });
        }
        router.back();
      }}
    />
  );
}
