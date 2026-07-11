import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
import type { SuggestionOptions } from "@tiptap/suggestion";
import renderItems from "../components/slash-menu/render-items";
import { getSuggestionItems } from "../components/slash-menu/menu-items";

export const slashMenuPluginKey = new PluginKey("slash-command");

const Command = Extension.create({
  addOptions() {
    return {
      suggestion: {
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          // Disable slash menu inside code blocks
          if ($from.parent.type.name === "codeBlock") {
            return false;
          }
          return true;
        },
        char: "/",
        command: ({ editor, range, props }) => {
          props.command({ editor, props, range });
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: slashMenuPluginKey,
        ...this.options.suggestion,
      }),
    ];
  },

  name: "slash-command",
});

const SlashCommand = Command.configure({
  suggestion: {
    items: ({ query }) => {
      const q = query.toLowerCase();
      return getSuggestionItems().filter(
        (item) =>
          item.title.toLowerCase().startsWith(q) ||
          item.searchTerms.some((term) => term.toLowerCase().startsWith(q)),
      );
    },
    render: renderItems,
  },
});

export { Command as SlashCommandExtension };
export default SlashCommand;
