import { useAddAutomaticRule } from "@/features/finance/add-automatic-rule-context";
import { TagPickerScreen } from "@/features/finance/components/tag-picker-screen";

export default function AutomaticRuleTagsScreen() {
  const { tags, toggleTag } = useAddAutomaticRule();

  return (
    <TagPickerScreen
      newTagPathname="/add-automatic-rule/tag-new"
      selectedTags={tags}
      toggleTag={toggleTag}
    />
  );
}
