import { Node, nodeInputRule } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { InlineMathView } from "../components/math/inline-math-view";
import { BlockMathView } from "../components/math/block-math-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    mathInline: {
      setMathInline: (attributes?: Record<string, unknown>) => ReturnType;
    };
    mathBlock: {
      setMathBlock: (attributes?: Record<string, unknown>) => ReturnType;
    };
  }
}

const inlineInputRegex = /(?:^|\s)((?:\$\$)((?:[^$]+))(?:\$\$))$/;
const blockInputRegex = /(?:^|\s)((?:\$\$\$)((?:[^$]+))(?:\$\$\$))$/;

export const MathInline = Node.create({
  addAttributes() {
    return {
      text: {
        default: "",
        parseHTML: (element) => element.innerHTML,
      },
    };
  },
  addCommands() {
    return {
      setMathInline:
        (attributes?: Record<string, unknown>) =>
        ({ commands }) =>
          commands.insertContent({ attrs: attributes, type: this.name }),
    };
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: inlineInputRegex,
        getAttributes: (match) => ({
          text: match[1].replaceAll("$", ""),
        }),
        type: this.type,
      }),
    ];
  },
  addNodeView() {
    this.editor.isInitialized = true;
    return ReactNodeViewRenderer(this.options.view);
  },

  addOptions() {
    return {
      HTMLAttributes: {},
      view: InlineMathView,
    };
  },

  atom: true,

  group: "inline",

  inline: true,

  name: "mathInline",

  parseHTML() {
    return [
      {
        getAttrs: (node: HTMLElement) => (Object.hasOwn(node.dataset, "katex") ? {} : false),
        tag: `span[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", { "data-katex": true, "data-type": this.name }, `${HTMLAttributes.text}`];
  },
});

export const MathBlock = Node.create({
  addAttributes() {
    return {
      text: {
        default: "",
        parseHTML: (element) => element.innerHTML,
      },
    };
  },
  addCommands() {
    return {
      setMathBlock:
        (attributes?: Record<string, unknown>) =>
        ({ commands }) =>
          commands.insertContent({ attrs: attributes, type: this.name }),
    };
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: blockInputRegex,
        getAttributes: (match) => ({
          text: match[1].replaceAll("$", ""),
        }),
        type: this.type,
      }),
    ];
  },
  addNodeView() {
    this.editor.isInitialized = true;
    return ReactNodeViewRenderer(this.options.view);
  },

  addOptions() {
    return {
      HTMLAttributes: {},
      view: BlockMathView,
    };
  },

  atom: true,

  group: "block",

  isolating: true,

  name: "mathBlock",

  parseHTML() {
    return [
      {
        getAttrs: (node: HTMLElement) => (Object.hasOwn(node.dataset, "katex") ? {} : false),
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { "data-katex": true, "data-type": this.name }, `${HTMLAttributes.text}`];
  },
});
