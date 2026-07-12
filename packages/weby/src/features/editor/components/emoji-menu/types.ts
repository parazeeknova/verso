import type { Range } from "@tiptap/core";
import type { useEditor } from "@tiptap/react";

export type EmojiMartFrequentlyType = Record<string, number>;

export interface CommandProps {
  editor: ReturnType<typeof useEditor>;
  range: Range;
}

export interface EmojiMenuItemType {
  id: string;
  emoji: string;
  count?: number;
  command: (props: CommandProps) => void;
}
