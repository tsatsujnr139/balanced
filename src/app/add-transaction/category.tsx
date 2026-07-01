import { router } from "expo-router";

import { useAddTransaction } from "@/features/finance/add-transaction-context";
import { CategoryPickerScreen } from "@/features/finance/components/category-picker-screen";

export default function TransactionCategoryScreen() {
  const {
    addCustomCategory,
    category: selectedCategory,
    customCategories,
    setCategory,
  } = useAddTransaction();

  return (
    <CategoryPickerScreen
      customCategories={customCategories}
      newCategoryPathname="/add-transaction/category-new"
      selectedCategoryName={selectedCategory}
      onSelectCategory={(category) => {
        addCustomCategory(category);
        setCategory(category.name);
        router.back();
      }}
    />
  );
}
