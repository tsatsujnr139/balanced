import { router } from "expo-router";

import { useAddBudget } from "@/features/finance/add-budget-context";
import { CategoryPickerScreen } from "@/features/finance/components/category-picker-screen";

export default function BudgetCategoryScreen() {
  const { category: selectedCategory, setCategory } = useAddBudget();

  return (
    <CategoryPickerScreen
      newCategoryPathname="/add-category"
      selectedCategoryName={selectedCategory?.name ?? null}
      onSelectCategory={(category) => {
        setCategory({
          color: category.color,
          name: category.name,
          symbol: category.symbol,
        });
        router.back();
      }}
    />
  );
}
