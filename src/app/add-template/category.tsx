import { router } from "expo-router";

import { useAddTemplate } from "@/features/finance/add-template-context";
import { CategoryPickerScreen } from "@/features/finance/components/category-picker-screen";

export default function TemplateCategoryScreen() {
  const { category: selectedCategory, setCategory } = useAddTemplate();

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
