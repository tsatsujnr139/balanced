import { router } from "expo-router";

import { useAddAutomaticRule } from "@/features/finance/add-automatic-rule-context";
import { CategoryPickerScreen } from "@/features/finance/components/category-picker-screen";

export default function AutomaticRuleCategoryScreen() {
  const { category: selectedCategory, setCategory } = useAddAutomaticRule();

  return (
    <CategoryPickerScreen
      newCategoryPathname="/add-category"
      selectedCategoryName={selectedCategory?.name ?? null}
      onSelectCategory={(category) => {
        setCategory(category);
        router.back();
      }}
    />
  );
}
