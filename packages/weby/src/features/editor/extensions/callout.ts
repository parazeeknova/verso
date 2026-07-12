// eslint-disable curly, no-plusplus, unicorn/consistent-function-scoping, unicorn/no-array-for-each, typescript-eslint/no-explicit-any, unicorn/prefer-dom-node-dataset, sort-keys, no-shadow, unicorn/prefer-ternary, react-hooks/exhaustive-deps, promise/prefer-await-to-callbacks, promise/prefer-await-to-then, jsx-a11y/prefer-tag-over-role, typescript-eslint/no-non-null-assertion
import { findParentNode, mergeAttributes, Node, wrappingInputRule } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import type { ComponentType } from "react";
import type { ReactNodeViewProps } from "@tiptap/react";
import CalloutView from "../components/callout/callout-view";
import type { CalloutType } from "../components/callout/callout-view";

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
  view: ComponentType<ReactNodeViewProps>;
}

export interface CalloutAttributes {
  type: CalloutType;
  icon?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attributes?: CalloutAttributes) => ReturnType;
      liftCallout: () => ReturnType;
      toggleCallout: (attributes?: CalloutAttributes) => ReturnType;
    };
  }
}

const validCalloutTypes = new Set<string>(["info", "success", "warning", "danger"]);

export const getValidCalloutType = (value: string): CalloutType => {
  if (value && validCalloutTypes.has(value)) {
    return value as CalloutType;
  }
  return "info";
};

export const Callout = Node.create<CalloutOptions>({
  name: "callout",
  content: "block+",
  defining: true,
  group: "block",

  addAttributes() {
    return {
      type: {
        default: "info",
        parseHTML: (element) => element.dataset.calloutType || "info",
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type,
        }),
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
      setCallout:
        (attributes) =>
        ({ commands }) =>
          commands.setNode(this.name, attributes),

      liftCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),

      toggleCallout:
        (attributes) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, attributes),
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^:::callout\s$/,
        type: this.type,
        getAttributes: () => ({ type: "info" }),
      }),
      wrappingInputRule({
        find: /^:::(info|success|warning|danger)\s$/,
        type: this.type,
        getAttributes: (match) => ({ type: getValidCalloutType(match[1]) }),
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state } = this.editor.view;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) {
          return false;
        }

        const callout = findParentNode((node) => node.type.name === this.name)(selection);

        if (!callout) {
          return false;
        }

        const isAtStart = $from.parentOffset === 0;

        if (!isAtStart) {
          return false;
        }

        const isFirstChild = $from.depth > 1 && $from.index($from.depth - 1) === 0;

        if (!isFirstChild) {
          return false;
        }

        this.editor.commands.liftCallout();
        return true;
      },
      Enter: () => {
        const { state } = this.editor.view;
        const { selection } = state;
        const { $from, empty } = selection;

        if (!empty) {
          return false;
        }

        const callout = findParentNode((node) => node.type.name === this.name)(selection);

        if (!callout) {
          return false;
        }

        const isAtEnd = $from.parentOffset === $from.parent.content.size;

        if (!isAtEnd) {
          return false;
        }

        const isLastChild =
          $from.depth > 1 && $from.index($from.depth - 1) === callout.node.childCount - 1;

        if (!isLastChild) {
          return false;
        }

        const isEmptyParagraph =
          $from.parent.type.name === "paragraph" && $from.parent.content.size === 0;

        if (!isEmptyParagraph) {
          return false;
        }

        const { view } = this.editor;
        const { tr } = state;

        const insertPos = callout.pos + callout.node.nodeSize;

        const deleted = tr.delete($from.before(), $from.after());

        const { defaultType } = state.doc.resolve(insertPos).parent.type.contentMatch;
        if (defaultType) {
          deleted.insert(insertPos - 2, defaultType.createAndFill()!);
          tr.setSelection(TextSelection.create(tr.doc, insertPos - 1));
        } else {
          tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
        }

        view.dispatch(tr);
        return true;
      },
    };
  },

  addNodeView() {
    this.editor.isInitialized = true;
    return ReactNodeViewRenderer(this.options.view);
  },

  addOptions() {
    return {
      HTMLAttributes: {},
      view: CalloutView,
    };
  },
});
export default Callout;
