import type { Range } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { ReactNodeViewRenderer, mergeAttributes } from "@tiptap/react";
import { ImageView } from "../components/image/image-view";

export interface ImageAttributes {
  src?: string;
  alt?: string;
  title?: string;
  align?: "left" | "center" | "right";
  width?: number | string;
  height?: number | string;
  aspectRatio?: number;
  placeholder?: {
    id: string;
    name: string;
  } | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      setImage: (attributes: ImageAttributes) => ReturnType;
      setImageAt: (attributes: ImageAttributes & { pos: number | Range }) => ReturnType;
      setImageAlign: (align: "left" | "center" | "right") => ReturnType;
      setImageWidth: (width: number | string) => ReturnType;
      setImageSize: (width: number | string, height: number | string) => ReturnType;
    };
  }
}

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      align: {
        default: "center",
        parseHTML: (element) => (element.dataset.align as "left" | "center" | "right") || "center",
        renderHTML: (attributes) => ({
          "data-align": attributes.align,
        }),
      },
      alt: {
        default: "",
        parseHTML: (element) => element.getAttribute("alt"),
        renderHTML: (attributes) => ({
          alt: attributes.alt,
        }),
      },
      aspectRatio: {
        default: null,
        parseHTML: (element) => {
          const val = element.dataset.aspectRatio;
          return val ? Number.parseFloat(val) : null;
        },
        renderHTML: (attributes) => ({
          "data-aspect-ratio": attributes.aspectRatio,
        }),
      },
      height: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => ({
          height: attributes.height,
        }),
      },
      placeholder: {
        default: null,
        rendered: false,
      },
      src: {
        default: "",
        parseHTML: (element) => element.getAttribute("src"),
        renderHTML: (attributes) => ({
          src: attributes.src,
        }),
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("title"),
        renderHTML: (attributes) => ({
          title: attributes.title,
        }),
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => ({
          width: attributes.width,
        }),
      },
    };
  },

  addCommands() {
    return {
      setImage:
        (attrs: ImageAttributes) =>
        ({ commands }) =>
          commands.insertContent({
            attrs,
            type: "image",
          }),

      setImageAlign:
        (align: "left" | "center" | "right") =>
        ({ commands }) =>
          commands.updateAttributes("image", { align }),

      setImageAt:
        (attrs) =>
        ({ commands }) =>
          commands.insertContentAt(attrs.pos, {
            attrs,
            type: "image",
          }),

      setImageSize:
        (width: number | string, height: number | string) =>
        ({ commands }) =>
          commands.updateAttributes("image", { height, width }),

      setImageWidth:
        (width: number | string) =>
        ({ commands }) =>
          commands.updateAttributes("image", { width }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
  atom: true,
  defining: true,
  group: "block",
  inline: false,

  isolating: true,

  name: "image",

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },
});

export default CustomImage;
