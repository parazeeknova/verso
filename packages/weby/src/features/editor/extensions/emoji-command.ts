import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
import type { SuggestionOptions } from "@tiptap/suggestion";
import { getEmojiItems } from "../components/emoji-menu/emoji-items";
import { renderEmojiItems } from "../components/emoji-menu/render-emoji-items";

export const emojiMenuPluginKey = new PluginKey("emoji-command");

const Command = Extension.create({
  addOptions() {
    return {
      suggestion: {
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          // Disable emoji menu inside code blocks
          if ($from.parent.type.name === "codeBlock") {
            return false;
          }
          return true;
        },
        char: ":",
        command: ({ editor, range, props }) => {
          const suggestionProps = props as { command: (p: unknown) => void };
          suggestionProps.command({ editor, props, range });
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: emojiMenuPluginKey,
        ...this.options.suggestion,
      }),
    ];
  },

  name: "emoji-command",
});

export const EmojiCommand = Command.configure({
  suggestion: {
    items: getEmojiItems,
    render: renderEmojiItems,
  },
});

export default EmojiCommand;
