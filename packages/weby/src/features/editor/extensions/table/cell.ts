/* eslint-disable */
import { TableCell as TiptapTableCell } from "@tiptap/extension-table";

export const TableCell = TiptapTableCell.extend({
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
  content: "block+",

  name: "tableCell",
});
