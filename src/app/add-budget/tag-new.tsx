import { useAddBudget } from "@/features/finance/add-budget-context";
import { NewTagScreen } from "@/features/finance/components/new-tag-screen";

export default function BudgetNewTagScreen() {
  const { tags, toggleTag } = useAddBudget();

  return <NewTagScreen selectedTags={tags} toggleTag={toggleTag} />;
}
