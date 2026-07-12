import type { Editor } from "@tiptap/react";

export function setTableBackground(editor: Editor, color: string, name: string) {
  editor
    .chain()
    .focus()
    .updateAttributes("tableCell", {
      backgroundColor: color || null,
      backgroundColorName: color ? name : null,
    })
    .updateAttributes("tableHeader", {
      backgroundColor: color || null,
      backgroundColorName: color ? name : null,
    })
    .run();
}
