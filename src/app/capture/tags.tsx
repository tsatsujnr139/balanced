import { useLocalSearchParams } from "expo-router";

import { useCapture } from "@/features/capture/capture-context";
import { TagPickerScreen } from "@/features/finance/components/tag-picker-screen";

export default function CaptureTagsScreen() {
  const { draft: draftParam } = useLocalSearchParams<{
    draft?: string | string[];
  }>();
  const draftKey = Array.isArray(draftParam) ? draftParam[0] : draftParam;
  const { drafts, toggleDraftTag } = useCapture();
  const draft = drafts.find((item) => item.key === draftKey);

  return (
    <TagPickerScreen
      newTagPathname="/add-tag"
      selectedTags={draft?.tags ?? []}
      toggleTag={(tag) => {
        if (draftKey) {
          toggleDraftTag(draftKey, tag);
        }
      }}
    />
  );
}
