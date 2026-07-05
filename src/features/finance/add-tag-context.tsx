import { createContext, useContext } from "react";

export interface TagDraft {
  color: string;
  name: string;
}

interface AddTagContextValue {
  draft: TagDraft;
  setDraft: (draft: TagDraft | ((current: TagDraft) => TagDraft)) => void;
}

export const AddTagContext = createContext<AddTagContextValue | null>(null);

export function useAddTag() {
  const context = useContext(AddTagContext);

  if (!context) {
    throw new Error("useAddTag must be used inside AddTagContext.Provider");
  }

  return context;
}
