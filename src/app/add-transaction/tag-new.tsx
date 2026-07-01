import { useAddTransaction } from "@/features/finance/add-transaction-context";
import { NewTagScreen } from "@/features/finance/components/new-tag-screen";

export default function TransactionNewTagScreen() {
  const { tags, toggleTag } = useAddTransaction();

  return <NewTagScreen selectedTags={tags} toggleTag={toggleTag} />;
}
