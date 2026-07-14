/* eslint-disable */
import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TableMap } from "@tiptap/pm/tables";
import { findTable, isEditorReady, moveColumn, moveRow } from "#/features/editor/extensions/table";

export type MoveDirection = "left" | "right" | "up" | "down";

function deriveIndexFromSelection(editor: Editor, orientation: "col" | "row"): number | null {
  const $head = editor.state.selection.$head;
  const table = findTable($head);
  if (!table) {
    return null;
  }
  const map = TableMap.get(table.node);
  const cellRect = map.findCell($head.pos - table.pos);
  return orientation === "col" ? cellRect.left : cellRect.top;
}

export function useTableMoveRowColumn(
  editor: Editor,
  orientation: "col" | "row",
  _index: number,
  direction: MoveDirection,
  _tableNode: ProseMirrorNode,
  _tablePos: number,
) {
  const handleMove = useCallback(() => {
    if (!isEditorReady(editor)) {
      return;
    }

    const table = findTable(editor.state.selection.$from);
    if (!table) {
      return;
    }
    const currentTableNode = table.node;
    const currentTablePos = table.pos;

    const originIndex = deriveIndexFromSelection(editor, orientation);
    if (originIndex === null) {
      return;
    }

    const map = TableMap.get(currentTableNode);
    const maxIndex = orientation === "col" ? map.width - 1 : map.height - 1;
    const targetIndex =
      direction === "left" || direction === "up" ? originIndex - 1 : originIndex + 1;
    if (targetIndex < 0 || targetIndex > maxIndex) {
      return;
    }

    const { tr } = editor.state;
    const moved =
      orientation === "col"
        ? moveColumn({
            originIndex,
            pos: currentTablePos + 1,
            select: true,
            targetIndex,
            tr,
          })
        : moveRow({
            originIndex,
            pos: currentTablePos + 1,
            select: true,
            targetIndex,
            tr,
          });
    if (moved) {
      editor.view.dispatch(tr);
    }
  }, [editor, orientation, direction]);

  const canMove = true;

  return { canMove, handleMove };
}
