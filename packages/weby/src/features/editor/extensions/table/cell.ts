import { TableCell as TiptapTableCell } from "@tiptap/extension-table";
import { tableCellAttributes } from "./table-attributes";

export const TableCell = TiptapTableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...tableCellAttributes(),
    };
  },
  content: "block+",

  name: "tableCell",
});
