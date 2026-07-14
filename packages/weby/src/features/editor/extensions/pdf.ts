import type { CommandProps } from "@tiptap/core";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PdfView } from "../components/pdf/pdf-view";

export interface PdfAttributes {
  src?: string;
  name?: string;
  attachmentId?: string;
  size?: number;
  width?: number | string;
  height?: number | string;
  placeholder?: {
    id: string;
    name: string;
  } | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pdfBlock: {
      setPdf: (attributes: PdfAttributes) => ReturnType;
      setPdfSize: (width: number | string, height: number | string) => ReturnType;
    };
  }
}

export const CustomPdf = Node.create({
  addAttributes() {
    return {
      attachmentId: {
        default: undefined,
        parseHTML: (element) => element.dataset.attachmentId,
        renderHTML: (attributes: PdfAttributes) => ({
          "data-attachment-id": attributes.attachmentId,
        }),
      },
      height: {
        default: 600,
        parseHTML: (element) => {
          const raw = element.getAttribute("height");
          if (!raw) {
            return 600;
          }
          const num = Number.parseFloat(raw);
          return Number.isNaN(num) ? 600 : num;
        },
        renderHTML: (attributes: PdfAttributes) => ({
          height: attributes.height,
        }),
      },
      name: {
        default: undefined,
        parseHTML: (element) => element.dataset.name,
        renderHTML: (attributes: PdfAttributes) => ({
          "data-name": attributes.name,
        }),
      },
      placeholder: {
        default: null,
        rendered: false,
      },
      size: {
        default: null,
        parseHTML: (element) => {
          const val = element.dataset.size;
          return val ? Number.parseInt(val, 10) : null;
        },
        renderHTML: (attributes: PdfAttributes) => ({
          "data-size": attributes.size,
        }),
      },
      src: {
        default: "",
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => ({
          src: attributes.src,
        }),
      },
      width: {
        default: 800,
        parseHTML: (element) => {
          const raw = element.getAttribute("width");
          if (!raw) {
            return 800;
          }
          const num = Number.parseFloat(raw);
          return Number.isNaN(num) ? 800 : num;
        },
        renderHTML: (attributes: PdfAttributes) => ({
          width: attributes.width,
        }),
      },
    };
  },
  addCommands() {
    return {
      setPdf:
        (attrs: PdfAttributes) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({
            attrs,
            type: "pdf",
          }),

      setPdfSize:
        (width: number | string, height: number | string) =>
        ({ commands }: CommandProps) =>
          commands.updateAttributes("pdf", { height, width }),
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(PdfView);
  },
  atom: true,
  defining: true,
  draggable: true,
  group: "block",

  inline: false,

  isolating: true,

  name: "pdf",

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
      mergeAttributes({ "data-type": this.name }, HTMLAttributes),
      [
        "iframe",
        {
          height: HTMLAttributes.height || 600,
          src: HTMLAttributes.src || "",
          width: HTMLAttributes.width || 800,
        },
      ],
    ];
  },
});

export default CustomPdf;
