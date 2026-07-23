import type { Editor } from "@tiptap/react";

export interface PageEditorProps {
  pageId: string;
  contentJson: string;
  editable: boolean;
  isLocked: boolean;
  title: string;
  spaceName?: string;
  spaceSlug?: string;
  creatorId?: string;
  createdAt?: string;
  updatedAt?: string;
  textContent?: string;
  isStandaloneShare?: boolean;
  shareToken?: string;
  onDeleteStart?: () => void;
  onDeleteSettled?: () => void;
}

export interface ToolbarProps {
  editor: Editor | null;
}
