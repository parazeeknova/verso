/* eslint-disable */
import { TableHeader as TiptapTableHeader } from "@tiptap/extension-table";
import { tableCellAttributes } from "./table-attributes";

export const TableHeader = TiptapTableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...tableCellAttributes(),
    };
  },
  content: "block+",

  name: "tableHeader",
});
