import { useAddPlannedPayment } from "@/features/finance/add-planned-payment-context";
import { NewTagScreen } from "@/features/finance/components/new-tag-screen";

export default function PlannedPaymentNewTagScreen() {
  const { tags, toggleTag } = useAddPlannedPayment();

  return <NewTagScreen selectedTags={tags} toggleTag={toggleTag} />;
}
