// eslint-disable curly, no-plusplus, unicorn/consistent-function-scoping, unicorn/no-array-for-each, typescript-eslint/no-explicit-any, unicorn/prefer-dom-node-dataset, sort-keys, no-shadow, unicorn/prefer-ternary, react-hooks/exhaustive-deps, promise/prefer-await-to-callbacks, promise/prefer-await-to-then, jsx-a11y/prefer-tag-over-role
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { ReactNodeViewRenderer } from "@tiptap/react";
import CodeBlockView from "../components/code-block/code-block-view";
import { Selection, TextSelection } from "@tiptap/pm/state";
import { GapCursor } from "@tiptap/pm/gapcursor";
import type { Node as PMNode } from "@tiptap/pm/model";

export const CustomCodeBlock = CodeBlockLowlight.extend({
  priority: 101,

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },

  addKeyboardShortcuts() {
    const isMermaid = (node: PMNode | null | undefined) =>
      node?.type === this.type && node.attrs.language === "mermaid";

    return {
      ...this.parent?.(),
      ArrowDown: ({ editor }) => {
        const { state } = editor;
        const { selection, doc } = state;
        const { $from, empty } = selection;

        if (!empty || $from.parent.type !== this.type) return false;
        if ($from.parentOffset !== $from.parent.nodeSize - 2) return false;

        const after = $from.after();
        if (after >= doc.content.size) {
          return editor.commands.exitCode();
        }

        const $after = doc.resolve(after);
        const { nodeAfter } = $after;

        if (isMermaid(nodeAfter)) {
          return editor.commands.command(({ tr }) => {
            tr.setSelection(TextSelection.create(tr.doc, after + 1));
            return true;
          });
        }

        if (nodeAfter?.type.spec.isolating && !nodeAfter.type.spec.atom) {
          return editor.commands.command(({ tr }) => {
            tr.setSelection(new GapCursor(tr.doc.resolve(after)));
            return true;
          });
        }

        return editor.commands.command(({ tr }) => {
          tr.setSelection(Selection.near(tr.doc.resolve(after)));
          return true;
        });
      },
      ArrowUp: ({ editor }) => {
        const { state } = editor;
        const { selection, doc } = state;
        const { $from, empty } = selection;

        if (!empty || $from.parent.type !== this.type) return false;
        if ($from.parentOffset !== 0) return false;

        const before = $from.before();
        if (before <= 0) return false;

        const $before = doc.resolve(before);
        const { nodeBefore } = $before;

        if (isMermaid(nodeBefore)) {
          return editor.commands.command(({ tr }) => {
            tr.setSelection(TextSelection.create(tr.doc, before - 1));
            return true;
          });
        }

        if (nodeBefore?.type.spec.isolating && !nodeBefore.type.spec.atom) {
          return editor.commands.command(({ tr }) => {
            tr.setSelection(new GapCursor(tr.doc.resolve(before)));
            return true;
          });
        }

        return false;
      },
      "Mod-a": () => {
        if (this.editor.isActive("codeBlock")) {
          const { state } = this.editor;
          const { $from } = state.selection;

          let codeBlockNode = null;
          let codeBlockPos = null;
          let depth = 0;

          for ({ depth } = $from; depth > 0; depth--) {
            const node = $from.node(depth);
            if (node.type.name === "codeBlock") {
              codeBlockNode = node;
              codeBlockPos = $from.start(depth) - 1;
              break;
            }
          }

          if (codeBlockNode && codeBlockPos !== null) {
            const codeBlockStart = codeBlockPos;
            const codeBlockEnd = codeBlockPos + codeBlockNode.nodeSize;

            const contentStart = codeBlockStart + 1;
            const contentEnd = codeBlockEnd - 1;

            this.editor.commands.setTextSelection({
              from: contentStart,
              to: contentEnd,
            });

            return true;
          }
        }

        return false;
      },
    };
  },
});
export default CustomCodeBlock;
