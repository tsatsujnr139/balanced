import { useAddBudget } from "@/features/finance/add-budget-context";
import { TagPickerScreen } from "@/features/finance/components/tag-picker-screen";

export default function BudgetTagsScreen() {
  const { tags, toggleTag } = useAddBudget();

  return (
    <TagPickerScreen
      newTagPathname="/add-budget/tag-new"
      selectedTags={tags}
      toggleTag={toggleTag}
    />
  );
}
