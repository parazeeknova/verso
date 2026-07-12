// eslint-disable curly, no-plusplus, unicorn/consistent-function-scoping, unicorn/no-array-for-each, typescript-eslint/no-explicit-any, unicorn/prefer-dom-node-dataset, sort-keys, no-shadow, unicorn/prefer-ternary, react-hooks/exhaustive-deps, promise/prefer-await-to-callbacks, promise/prefer-await-to-then, jsx-a11y/prefer-tag-over-role
import { Node, mergeAttributes, findParentNode } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Fragment } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type ColumnsLayout =
  | "two_equal"
  | "two_left_sidebar"
  | "two_right_sidebar"
  | "three_equal"
  | "three_left_wide"
  | "three_right_wide"
  | "three_with_sidebars"
  | "four_equal"
  | "five_equal";

export interface ColumnsOptions {
  HTMLAttributes: Record<string, any>;
}

export type WidthMode = "normal" | "wide";

export interface ColumnsAttributes {
  layout?: ColumnsLayout;
  widthMode?: WidthMode;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columns: {
      insertColumns: (attributes?: ColumnsAttributes) => ReturnType;
      setColumnsWidthMode: (widthMode: WidthMode) => ReturnType;
      setColumnCount: (count: number) => ReturnType;
      setColumnsLayout: (layout: ColumnsLayout) => ReturnType;
    };
    column: {
      setColumnWidth: (width: number | null) => ReturnType;
    };
  }
}

const columnCountFromLayout = (layout: string): number => {
  if (layout.startsWith("five")) return 5;
  if (layout.startsWith("four")) return 4;
  if (layout.startsWith("three")) return 3;
  return 2;
};

const defaultLayoutForCount = (count: number): ColumnsLayout => {
  if (count === 3) return "three_equal";
  if (count === 4) return "four_equal";
  if (count === 5) return "five_equal";
  return "two_equal";
};

export const Column = Node.create({
  name: "column",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  selectable: false,

  addAttributes() {
    return {
      width: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute("data-width");
          return value ? Number.parseFloat(value) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return {
            "data-width": attributes.width,
            style: `flex: ${attributes.width}`,
          };
        },
      },
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
    return ["div", mergeAttributes({ "data-type": this.name }, HTMLAttributes), 0];
  },

  addKeyboardShortcuts() {
    const jumpToColumn = (direction: 1 | -1) => () => {
      const { state, dispatch } = this.editor.view;

      const columns = findParentNode((node) => node.type.name === "columns")(state.selection);
      if (!columns) return false;

      const column = findParentNode((node) => node.type.name === "column")(state.selection);
      if (!column) return false;

      let currentIndex = -1;
      columns.node.forEach((_child, offset, index) => {
        if (columns.pos + 1 + offset === column.pos) {
          currentIndex = index;
        }
      });

      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= columns.node.childCount) {
        return true;
      }

      let offset = 0;
      for (let j = 0; j < targetIndex; j++) {
        offset += columns.node.child(j).nodeSize;
      }

      const targetPos = columns.pos + 1 + offset + 1 + 1;
      if (dispatch) {
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, targetPos)));
      }
      return true;
    };

    return {
      Tab: jumpToColumn(1),
      "Shift-Tab": jumpToColumn(-1),
    };
  },

  addCommands() {
    return {
      setColumnWidth:
        (width) =>
        ({ commands }) =>
          commands.updateAttributes("column", { width }),
    };
  },
});

export const Columns = Node.create<ColumnsOptions>({
  name: "columns",
  group: "block",
  content: "column+",
  defining: true,
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      layout: {
        default: "two_equal",
        parseHTML: (element) => element.getAttribute("data-layout") as ColumnsLayout,
        renderHTML: (attributes: ColumnsAttributes) => ({
          "data-layout": attributes.layout,
        }),
      },
      widthMode: {
        default: "normal",
        parseHTML: (element) => (element.getAttribute("data-width-mode") || "normal") as WidthMode,
        renderHTML: (attributes: ColumnsAttributes) => {
          if (!attributes.widthMode || attributes.widthMode === "normal") return {};
          return { "data-width-mode": attributes.widthMode };
        },
      },
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
      mergeAttributes({ "data-type": this.name }, this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      insertColumns:
        (attributes) =>
        ({ tr, state, dispatch }) => {
          const layout = attributes?.layout || "two_equal";
          const count = columnCountFromLayout(layout);

          const columnType = state.schema.nodes.column;
          const paraType = state.schema.nodes.paragraph;
          const children = Array.from({ length: count }, () =>
            columnType.create(null, paraType.create()),
          );
          const columnsNode = this.type.create(attributes, Fragment.from(children));

          const stepsBefore = tr.steps.length;
          tr.replaceSelectionWith(columnsNode);

          if (tr.steps.length > stepsBefore) {
            const lastStep = tr.steps.at(-1);
            if (lastStep) {
              const stepMap = lastStep.getMap();
              let insertStart = 0;
              // eslint-disable-next-line unicorn/no-array-for-each
              stepMap.forEach((_from, _to, newFrom) => {
                insertStart = newFrom;
              });
              tr.setSelection(TextSelection.near(tr.doc.resolve(insertStart + 1), 1));
            }
          }

          if (dispatch) dispatch(tr);
          return true;
        },

      setColumnsWidthMode:
        (widthMode) =>
        ({ commands }) =>
          commands.updateAttributes("columns", { widthMode }),

      setColumnCount:
        (count: number) =>
        ({ tr, state }) => {
          const predicate = (node: PMNode) => node.type.name === "columns";
          const parent = findParentNode(predicate)(state.selection);
          if (!parent) return false;

          const { node: columnsNode, pos: parentPos } = parent;
          const currentCount = columnsNode.childCount;
          if (count === currentCount || count < 2 || count > 5) return false;

          const columnType = state.schema.nodes.column;
          const paraType = state.schema.nodes.paragraph;
          const newChildren: PMNode[] = [];

          if (count > currentCount) {
            for (let i = 0; i < currentCount; i++) {
              newChildren.push(columnsNode.child(i));
            }
            for (let i = currentCount; i < count; i++) {
              newChildren.push(columnType.create(null, paraType.create()));
            }
          } else {
            for (let i = 0; i < count - 1; i++) {
              newChildren.push(columnsNode.child(i));
            }
            let mergedContent = columnsNode.child(count - 1).content;
            for (let j = count; j < currentCount; j++) {
              const col = columnsNode.child(j);
              const nonEmpty: PMNode[] = [];
              col.content.forEach((child) => {
                if (child.type.name !== "paragraph" || child.content.size > 0) {
                  nonEmpty.push(child);
                }
              });
              if (nonEmpty.length > 0) {
                mergedContent = mergedContent.append(Fragment.from(nonEmpty));
              }
            }
            newChildren.push(columnType.create(null, mergedContent));
          }

          const newLayout = defaultLayoutForCount(count);
          const newNode = columnsNode.type.create(
            { ...columnsNode.attrs, layout: newLayout },
            Fragment.from(newChildren),
          );
          tr.replaceWith(parentPos, parentPos + columnsNode.nodeSize, newNode);
          tr.setSelection(TextSelection.near(tr.doc.resolve(parentPos + 1), 1));
          return true;
        },

      setColumnsLayout:
        (layout) =>
        ({ commands }) =>
          commands.updateAttributes("columns", { layout }),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("columnsFocus"),
        props: {
          decorations: (state) => {
            const parent = findParentNode((node) => node.type.name === "columns")(state.selection);
            if (!parent) return DecorationSet.empty;
            return DecorationSet.create(state.doc, [
              Decoration.node(parent.pos, parent.pos + parent.node.nodeSize, {
                class: "has-focus",
              }),
            ]);
          },
        },
      }),
    ];
  },
});
