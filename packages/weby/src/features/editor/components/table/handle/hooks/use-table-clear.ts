/* eslint-disable */
import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { cellAround, TableMap } from "@tiptap/pm/tables";
import { findTable, isEditorReady } from "#/features/editor/extensions/table";

type Scope =
  | { kind: "col"; index: number }
  | { kind: "row"; index: number }
  | { kind: "cell"; cellPos: number };

function deriveIndexFromSelection(
  editor: import("@tiptap/react").Editor,
  orientation: "col" | "row",
  _fallbackIndex: number,
): number | null {
  const $head = editor.state.selection.$head;
  const table = findTable($head);
  if (!table) {return null;}
  const map = TableMap.get(table.node);
  const tableStart = table.pos;
  const cellRect = map.findCell($head.pos - tableStart);
  return orientation === "col" ? cellRect.left : cellRect.top;
}

export function useTableClear(
  editor: Editor,
  _tableNode: ProseMirrorNode,
  _tablePos: number,
  scope: Scope,
) {
  return useCallback(() => {
    if (!isEditorReady(editor)) {return;}

    const table = findTable(editor.state.selection.$from);
    if (!table) {return;}
    const currentTableNode = table.node;
    const currentTablePos = table.pos;

    const {tr} = editor.state;
    const tableStart = currentTablePos + 1;
    const map = TableMap.get(currentTableNode);
    const {paragraph} = editor.schema.nodes;
    if (!paragraph) {return;}

    const cellOffsets: number[] = [];

    if (scope.kind === "col") {
      const resolvedIndex = deriveIndexFromSelection(editor, "col", scope.index) ?? scope.index;
      for (let row = 0; row < map.height; row++) {
        cellOffsets.push(map.map[row * map.width + resolvedIndex]);
      }
    } else if (scope.kind === "row") {
      const resolvedIndex = deriveIndexFromSelection(editor, "row", scope.index) ?? scope.index;
      for (let col = 0; col < map.width; col++) {
        cellOffsets.push(map.map[resolvedIndex * map.width + col]);
      }
    }

    let targets: number[];
    if (scope.kind === "cell") {
      const $cell = cellAround(editor.state.selection.$head);
      targets = $cell ? [$cell.pos] : [];
    } else {
      targets = [...new Set(cellOffsets)].map((o) => tableStart + o);
    }

    // Process in reverse position order so earlier replacements don't shift later ones.
    targets.sort((a, b) => b - a);

    for (const cellPos of targets) {
      const node = tr.doc.nodeAt(cellPos);
      if (!node) {continue;}
      const start = cellPos + 1;
      const end = cellPos + node.nodeSize - 1;
      tr.replaceWith(start, end, paragraph.create());
    }

    if (tr.docChanged) {editor.view.dispatch(tr);}
  }, [editor, scope]);
}
