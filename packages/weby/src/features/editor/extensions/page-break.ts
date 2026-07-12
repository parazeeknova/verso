// eslint-disable curly, no-plusplus, unicorn/consistent-function-scoping, unicorn/no-array-for-each, typescript-eslint/no-explicit-any, unicorn/prefer-dom-node-dataset, sort-keys, no-shadow, unicorn/prefer-ternary, react-hooks/exhaustive-deps, promise/prefer-await-to-callbacks, promise/prefer-await-to-then, jsx-a11y/prefer-tag-over-role, import/no-named-as-default
import { mergeAttributes, Node } from "@tiptap/core";

export interface PageBreakOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create<PageBreakOptions>({
  name: "pageBreak",

  group: "block",

  atom: true,

  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(
        { "data-type": this.name, class: "page-break" },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) =>
          chain().insertContent({ type: this.name }).focus().run(),
    };
  },
});
export default PageBreak;
