import { useAddTemplate } from "@/features/finance/add-template-context";
import { NewTagScreen } from "@/features/finance/components/new-tag-screen";

export default function TemplateNewTagScreen() {
  const { tags, toggleTag } = useAddTemplate();

  return <NewTagScreen selectedTags={tags} toggleTag={toggleTag} />;
}
