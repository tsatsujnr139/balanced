import { useAddTransaction } from "@/features/finance/add-transaction-context";
import { TagPickerScreen } from "@/features/finance/components/tag-picker-screen";

export default function TransactionTagsScreen() {
  const { tags, toggleTag } = useAddTransaction();

  return (
    <TagPickerScreen
      newTagPathname="/add-transaction/tag-new"
      selectedTags={tags}
      toggleTag={toggleTag}
    />
  );
}
