import type { CommandProps } from "@tiptap/core";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { AudioView } from "../components/audio/audio-view";

export interface AudioAttributes {
  src?: string;
  attachmentId?: string;
  size?: number;
  placeholder?: {
    id: string;
    name: string;
  } | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audioBlock: {
      setAudio: (attributes: AudioAttributes) => ReturnType;
    };
  }
}

export const CustomAudio = Node.create({
  addAttributes() {
    return {
      attachmentId: {
        default: undefined,
        parseHTML: (element) => element.dataset.attachmentId,
        renderHTML: (attributes: AudioAttributes) => ({
          "data-attachment-id": attributes.attachmentId,
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
        renderHTML: (attributes: AudioAttributes) => ({
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
    };
  },
  addCommands() {
    return {
      setAudio:
        (attrs: AudioAttributes) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({
            attrs,
            type: "audio",
          }),
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(AudioView);
  },
  atom: true,
  defining: true,
  draggable: true,
  group: "block",

  inline: false,

  isolating: true,

  name: "audio",

  parseHTML() {
    return [
      {
        tag: "audio",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["audio", mergeAttributes({ controls: "true", preload: "metadata" }, HTMLAttributes)];
  },
});

export default CustomAudio;
