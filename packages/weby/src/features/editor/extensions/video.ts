import type { CommandProps } from "@tiptap/core";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { VideoView } from "../components/video/video-view";

export interface VideoAttributes {
  src?: string;
  alt?: string;
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
    videoBlock: {
      setVideo: (attributes: VideoAttributes) => ReturnType;
      setVideoAlign: (align: "left" | "center" | "right") => ReturnType;
      setVideoWidth: (width: number | string) => ReturnType;
      setVideoSize: (width: number | string, height: number | string) => ReturnType;
    };
  }
}

export const CustomVideo = Node.create({
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
      setVideo:
        (attrs: VideoAttributes) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({
            attrs,
            type: "video",
          }),

      setVideoAlign:
        (align: "left" | "center" | "right") =>
        ({ commands }: CommandProps) =>
          commands.updateAttributes("video", { align }),

      setVideoSize:
        (width: number | string, height: number | string) =>
        ({ commands }: CommandProps) =>
          commands.updateAttributes("video", { height, width }),

      setVideoWidth:
        (width: number | string) =>
        ({ commands }: CommandProps) =>
          commands.updateAttributes("video", { width }),
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
  atom: true,
  defining: true,
  draggable: true,
  group: "block",

  inline: false,

  isolating: true,

  name: "video",

  parseHTML() {
    return [
      {
        tag: "video",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["video", mergeAttributes({ controls: "true" }, HTMLAttributes)];
  },
});

export default CustomVideo;
