/* eslint-disable */
export * from "./row";
export * from "./cell";
export * from "./header";
export * from "./table";
export * from "./dnd";
export * from "./table-view";
export * from "./header-pin";
export * from "./table-readonly-sort";
export { moveColumn } from "./utils/move-column";
export type { MoveColumnParams } from "./utils/move-column";
export { moveRow } from "./utils/move-row";
export type { MoveRowParams } from "./utils/move-row";
export { convertTableNodeToArrayOfRows } from "./utils/convert-table-node-to-array-of-rows";
export { convertArrayOfRowsToTableNode } from "./utils/convert-array-of-rows-to-table-node";
export { transpose } from "./utils/transpose";

import { isTextSelection } from "@tiptap/core";
import { type Editor } from "@tiptap/core";

export function isEditorReady(
  editor: Editor | null | undefined,
): editor is Editor {
  return !!editor && editor.isInitialized;
}

export function isTextSelected(editor: Editor) {
  const {
    state: {
      doc,
      selection,
      selection: { empty, from, to },
    },
  } = editor;

  const isEmptyTextBlock =
    !doc.textBetween(from, to).length && isTextSelection(selection);

  if (empty || isEmptyTextBlock || !editor.isEditable) {
    return false;
  }

  return true;
}

export { isCellSelection } from "./utils/query";
