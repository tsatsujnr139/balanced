import { router } from "expo-router";

import { useAddPlannedPayment } from "@/features/finance/add-planned-payment-context";
import { CategoryPickerScreen } from "@/features/finance/components/category-picker-screen";

export default function PlannedPaymentCategoryScreen() {
  const { category: selectedCategory, setCategory } = useAddPlannedPayment();

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
