import { useAddTemplate } from "@/features/finance/add-template-context";
import { TagPickerScreen } from "@/features/finance/components/tag-picker-screen";

export default function TemplateTagsScreen() {
  const { tags, toggleTag } = useAddTemplate();

  return (
    <TagPickerScreen
      newTagPathname="/add-template/tag-new"
      selectedTags={tags}
      toggleTag={toggleTag}
    />
  );
}
