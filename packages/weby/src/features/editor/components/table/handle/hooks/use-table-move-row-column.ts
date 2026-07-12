/* eslint-disable */
import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TableMap } from "@tiptap/pm/tables";
import { findTable, isEditorReady, moveColumn, moveRow } from "#/features/editor/extensions/table";

export type MoveDirection = "left" | "right" | "up" | "down";

export function useTableMoveRowColumn(
  editor: Editor,
  orientation: "col" | "row",
  index: number,
  direction: MoveDirection,
  _tableNode: ProseMirrorNode,
  _tablePos: number,
) {
  const target = direction === "left" || direction === "up" ? index - 1 : index + 1;

  const handleMove = useCallback(() => {
    if (!canMove || !isEditorReady(editor)) {return;}

    const table = findTable(editor.state.selection.$from);
    if (!table) {return;}
    const currentTableNode = table.node;
    const currentTablePos = table.pos;

    const map = TableMap.get(currentTableNode);
    const maxIndex = orientation === "col" ? map.width - 1 : map.height - 1;
    if (target < 0 || target > maxIndex) {return;}

    const {tr} = editor.state;
    const moved =
      orientation === "col"
        ? moveColumn({
            originIndex: index,
            pos: currentTablePos + 1,
            select: true,
            targetIndex: target,
            tr,
          })
        : moveRow({
            originIndex: index,
            pos: currentTablePos + 1,
            select: true,
            targetIndex: target,
            tr,
          });
    if (moved) {editor.view.dispatch(tr);}
  }, [editor, orientation, index, target]);

  const canMove = target >= 0;

  return { canMove, handleMove };
}
