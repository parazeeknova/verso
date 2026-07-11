/* eslint-disable */
import { TableHeader as TiptapTableHeader } from "@tiptap/extension-table";

export const TableHeader = TiptapTableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) =>
          element.style.backgroundColor || element.dataset.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            "data-background-color": attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
      backgroundColorName: {
        default: null,
        parseHTML: (element) => element.dataset.backgroundColorName || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColorName) {
            return {};
          }
          return {
            "data-background-color-name": attributes.backgroundColorName.toLowerCase(),
          };
        },
      },
    };
  },
  content:
    "(paragraph | heading | bulletList | orderedList | taskList | blockquote | callout | image | video | audio | subpages | attachment | mathBlock | details | codeBlock)+",

  name: "tableHeader",
});
