import type { Editor, Range } from "@tiptap/core";

export interface CommandProps {
  editor: Editor;
  range: Range;
}

export interface SlashMenuItemType {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  searchTerms: string[];
  command: (props: CommandProps) => void;
}
