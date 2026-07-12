// eslint-disable curly, no-plusplus, unicorn/consistent-function-scoping, unicorn/no-array-for-each, typescript-eslint/no-explicit-any, unicorn/prefer-dom-node-dataset, sort-keys, no-shadow, unicorn/prefer-ternary, react-hooks/exhaustive-deps, promise/prefer-await-to-callbacks, promise/prefer-await-to-then, jsx-a11y/prefer-tag-over-role
import {
  Node,
  findChildren,
  findParentNode,
  mergeAttributes,
  wrappingInputRule,
} from "@tiptap/core";
import type { Editor } from "@tiptap/core";

export interface DetailsOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const setAttributes = (
  editor: Editor,
  getPos: (() => number | undefined) | boolean,
  attrs: Record<string, unknown>,
) => {
  if (editor.isEditable && typeof getPos === "function") {
    const pos = getPos();
    if (pos !== undefined) {
      editor.view.dispatch(editor.view.state.tr.setNodeMarkup(pos, undefined, attrs));
    }
  }
};

export const icon = (name: string) => {
  if (name === "right-line") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="ProseMirror-icon"><path fill="currentColor" d="M13.1717 12.0007L8.22168 7.05093L9.63589 5.63672L16.0001 12.0009L9.63589 18.3651L8.22168 16.9509L13.1717 12.0007Z"></path></svg>`;
  }
  return "";
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    details: {
      setDetails: () => ReturnType;
      toggleDetails: () => ReturnType;
      unsetDetails: () => ReturnType;
    };
  }
}

export const DetailsSummary = Node.create({
  name: "detailsSummary",

  content: "text*",

  defining: true,

  isolating: true,

  selectable: false,

  parseHTML() {
    return [
      {
        tag: `summary[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["summary", mergeAttributes({ "data-type": this.name }, HTMLAttributes), 0];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor.view;
        const { $from } = state.selection;
        if ($from.parent.type.name === this.name) {
          const parent = findParentNode((node) => node.type.name === "details")(state.selection);
          if (parent) {
            const [contentNode] = findChildren(
              parent.node,
              (node) => node.type.name === "detailsContent",
            );
            if (contentNode) {
              const contentPos = parent.pos + contentNode.pos + 2;
              this.editor.commands.setTextSelection(contentPos);
              return true;
            }
          }
        }
        return false;
      },
      Backspace: () => {
        const { state } = this.editor.view;
        const { $from } = state.selection;
        if ($from.parent.type.name === this.name && $from.parent.textContent.length === 0) {
          return this.editor.commands.unsetDetails();
        }
        return false;
      },
    };
  },
});

export const DetailsContent = Node.create({
  name: "detailsContent",

  content: "block+",

  defining: true,

  isolating: true,

  selectable: false,

  parseHTML() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": this.name }, HTMLAttributes), 0];
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state } = this.editor.view;
        const { $from } = state.selection;
        const parentContent = findParentNode((node) => node.type.name === "detailsContent")(
          state.selection,
        );
        if (parentContent) {
          const isFirstBlock = parentContent.node.firstChild === $from.parent;
          if (isFirstBlock && $from.parentOffset === 0) {
            const parentDetails = findParentNode((node) => node.type.name === "details")(
              state.selection,
            );
            if (parentDetails) {
              const [summaryNode] = findChildren(
                parentDetails.node,
                (node) => node.type.name === "detailsSummary",
              );
              if (summaryNode) {
                const summaryEndPos =
                  parentDetails.pos + summaryNode.pos + summaryNode.node.nodeSize - 1;
                this.editor.commands.setTextSelection(summaryEndPos);
                return true;
              }
            }
          }
        }
        return false;
      },
    };
  },
});

export const Details = Node.create<DetailsOptions>({
  name: "details",

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.getAttribute("open") === "true",
        renderHTML: (attributes) => {
          if (attributes.open) {
            return {
              open: "true",
            };
          }

          return {};
        },
      },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const dom = document.createElement("div");
      const btn = document.createElement("button");
      const ico = document.createElement("span");
      const div = document.createElement("div");

      dom.setAttribute("data-type", this.name);
      btn.setAttribute("data-type", "detailsButton");
      btn.setAttribute("contenteditable", "false");
      btn.type = "button";
      div.setAttribute("data-type", "detailsContainer");

      if (editor.isEditable) {
        dom.classList.add("has-focus");
      }

      if (node.attrs.open) {
        dom.setAttribute("open", "true");
      }

      const keys = Object.keys(HTMLAttributes);
      for (const key of keys) {
        if (key !== "open") {
          dom.setAttribute(key, HTMLAttributes[key]);
        }
      }

      ico.innerHTML = icon("right-line");
      btn.addEventListener("click", () => {
        const open = !dom.hasAttribute("open");

        if (!editor.isEditable) {
          if (open) {
            dom.setAttribute("open", "true");
          } else {
            dom.removeAttribute("open");
          }
          return;
        }

        setAttributes(editor, getPos, { ...node.attrs, open });
      });

      btn.append(ico);
      dom.append(btn);
      dom.append(div);
      return {
        contentDOM: div,
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) {
            return false;
          }
          if (!editor.isEditable) {
            return true;
          }
          if (updatedNode.attrs.open) {
            dom.setAttribute("open", "true");
          } else {
            dom.removeAttribute("open");
          }
          return true;
        },
      };
    };
  },

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  allowGapCursor: false,

  content: "detailsSummary detailsContent",

  defining: true,

  group: "block",

  isolating: true,

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
      mergeAttributes({ "data-type": this.name }, this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setDetails:
        () =>
        ({ state, chain }) => {
          const range = state.selection.$from.blockRange(state.selection.$to);
          if (!range) {
            return false;
          }

          const slice = state.doc.slice(range.start, range.end);

          if (slice.content.firstChild?.type.name === "detailsSummary") return false;

          if (!state.schema.nodes.detailsContent.contentMatch.matchFragment(slice.content)) {
            return false;
          }

          return chain()
            .insertContentAt(
              {
                from: range.start,
                to: range.end,
              },
              {
                type: this.name,
                attrs: {
                  open: true,
                },
                content: [
                  {
                    type: "detailsSummary",
                  },
                  {
                    type: "detailsContent",
                    content: slice.toJSON()?.content ?? [],
                  },
                ],
              },
            )
            .setTextSelection(range.start + 2)
            .run();
        },

      toggleDetails:
        () =>
        ({ state, chain }) => {
          const node = findParentNode((node) => node.type === this.type)(state.selection);
          if (node) {
            return chain().unsetDetails().run();
          }
          return chain().setDetails().run();
        },

      unsetDetails:
        () =>
        ({ state, chain }) => {
          const parent = findParentNode((node) => node.type === this.type)(state.selection);
          if (!parent) {
            return false;
          }

          const summary = findChildren(parent.node, (node) => node.type.name === "detailsSummary");
          const content = findChildren(parent.node, (node) => node.type.name === "detailsContent");
          if (!summary.length || !content.length) {
            return false;
          }

          const range = {
            from: parent.pos,
            to: parent.pos + parent.node.nodeSize,
          };
          const { defaultType } = state.doc.resolve(range.from).parent.type.contentMatch;
          return chain()
            .insertContentAt(range, [
              defaultType?.create(null, summary[0].node.content).toJSON(),
              ...(content[0].node.content.toJSON() ?? []),
            ])
            .setTextSelection(range.from + 1)
            .run();
        },
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^:::details\s$/,
        type: this.type,
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-d": () => this.editor.commands.toggleDetails(),
    };
  },
});
export default Details;
