import {
  TextBolderIcon,
  TextItalicIcon,
  LinkSimpleIcon,
  HighlighterIcon,
  ChatCircleDotsIcon,
} from "@phosphor-icons/react";
import { BubbleMenu as TipTapBubbleMenu } from "@tiptap/react/menus";
import type { ToolbarProps } from "#/features/editor/types/editor.types";
import { useTheme } from "#/shared/hooks/use-theme";

interface BubbleMenuProps extends ToolbarProps {
  onAddComment?: () => void;
}

export const BubbleMenu = ({ editor, onAddComment }: BubbleMenuProps) => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  if (!editor) {
    return null;
  }

  const btn = (active: boolean | undefined) =>
    `p-1 cursor-pointer ${active ? t("text-text-dark", "text-text-light") : t("text-text-dark/50", "text-text-light/50")}`;

  return (
    <TipTapBubbleMenu
      className={`flex items-center gap-0.5 rounded border py-1 px-1.5 shadow-lg ${t("border-border-dark bg-text-light", "border-border-light bg-white")}`}
      editor={editor}
    >
      <button
        className={btn(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
        type="button"
      >
        <TextBolderIcon size={13} weight={editor.isActive("bold") ? "fill" : "regular"} />
      </button>
      <button
        className={btn(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        type="button"
      >
        <TextItalicIcon size={13} weight={editor.isActive("italic") ? "fill" : "regular"} />
      </button>
      <button
        className={btn(editor.isActive("link"))}
        onClick={() => {
          const previousUrl = editor.getAttributes("link").href;
          // eslint-disable-next-line no-alert
          const url = window.prompt("URL", previousUrl);
          if (url === null) {
            return;
          }
          const trimmed = url.trim();
          if (trimmed === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          let href = trimmed;
          if (
            !/^https?:\/\//i.test(href) &&
            !/^mailto:/i.test(href) &&
            !/^tel:/i.test(href) &&
            !href.startsWith("/") &&
            !href.startsWith("#")
          ) {
            href = `https://${href}`;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
        }}
        type="button"
      >
        <LinkSimpleIcon size={13} weight={editor.isActive("link") ? "fill" : "regular"} />
      </button>
      <button
        className={btn(editor.isActive("highlight"))}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        type="button"
      >
        <HighlighterIcon size={13} weight={editor.isActive("highlight") ? "fill" : "regular"} />
      </button>

      {onAddComment && (
        <button
          className={btn(editor.isActive("comment"))}
          onClick={onAddComment}
          title="Add comment"
          type="button"
        >
          <ChatCircleDotsIcon size={13} weight={editor.isActive("comment") ? "fill" : "regular"} />
        </button>
      )}
    </TipTapBubbleMenu>
  );
};
