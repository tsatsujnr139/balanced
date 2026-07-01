import { useAddPlannedPayment } from "@/features/finance/add-planned-payment-context";
import { TagPickerScreen } from "@/features/finance/components/tag-picker-screen";

export default function PlannedPaymentTagsScreen() {
  const { tags, toggleTag } = useAddPlannedPayment();

  return (
    <TagPickerScreen
      newTagPathname="/add-planned-payment/tag-new"
      selectedTags={tags}
      toggleTag={toggleTag}
    />
  );
}
