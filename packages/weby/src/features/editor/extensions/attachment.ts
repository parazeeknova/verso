import type { CommandProps } from "@tiptap/core";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { AttachmentView } from "../components/attachment/attachment-view";

// Only relative URLs and http/https protocols are allowed; anything else
// (e.g. `javascript:`) is dropped so it can never become an href attribute.
const sanitizeAttachmentUrl = (url: string | undefined): string => {
  if (!url) {
    return "";
  }
  if (url.startsWith("/") || url.startsWith("#") || url.startsWith(".") || url.startsWith("?")) {
    return url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {
    // Not an absolute URL; treat the remainder as a relative path.
    return url;
  }
  return "";
};

export interface AttachmentAttributes {
  url?: string;
  name?: string;
  mime?: string;
  size?: number;
  attachmentId?: string;
  placeholder?: { id: string; name: string } | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    attachment: {
      setAttachment: (attributes: AttachmentAttributes) => ReturnType;
    };
  }
}

export const CustomAttachment = Node.create({
  addAttributes() {
    return {
      attachmentId: {
        default: undefined,
        parseHTML: (element: HTMLElement) => element.dataset.attachmentId,
        renderHTML: (attributes: AttachmentAttributes) => ({
          "data-attachment-id": attributes.attachmentId,
        }),
      },
      mime: {
        default: undefined,
        parseHTML: (element: HTMLElement) => element.dataset.attachmentMime,
        renderHTML: (attributes: AttachmentAttributes) => ({
          "data-attachment-mime": attributes.mime,
        }),
      },
      name: {
        default: undefined,
        parseHTML: (element: HTMLElement) => element.dataset.attachmentName,
        renderHTML: (attributes: AttachmentAttributes) => ({
          "data-attachment-name": attributes.name,
        }),
      },
      placeholder: {
        default: null,
        rendered: false,
      },
      size: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const val = element.dataset.attachmentSize;
          return val ? Number.parseInt(val, 10) : null;
        },
        renderHTML: (attributes: AttachmentAttributes) => ({
          "data-attachment-size": attributes.size,
        }),
      },
      url: {
        default: "",
        parseHTML: (element: HTMLElement) => sanitizeAttachmentUrl(element.dataset.attachmentUrl),
        renderHTML: (attributes: AttachmentAttributes) => ({
          "data-attachment-url": sanitizeAttachmentUrl(attributes.url),
        }),
      },
    };
  },

  addCommands() {
    return {
      setAttachment:
        (attrs: AttachmentAttributes) =>
        ({ commands }: CommandProps) =>
          commands.insertContent({
            attrs,
            type: "attachment",
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentView);
  },

  atom: true,
  defining: true,
  draggable: true,
  group: "block",
  inline: false,
  isolating: true,
  name: "attachment",

  parseHTML() {
    return [
      {
        tag: `div[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const href = sanitizeAttachmentUrl(HTMLAttributes["data-attachment-url"] || "");
    return [
      "div",
      mergeAttributes({ "data-type": this.name }, HTMLAttributes),
      [
        "a",
        {
          class: "attachment",
          href,
          rel: "noopener noreferrer",
          target: "_blank",
        },
        `${HTMLAttributes["data-attachment-name"] || "attachment"}`,
      ],
    ];
  },
});

export default CustomAttachment;
