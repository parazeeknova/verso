/* eslint-disable */
import type { Selection } from "@tiptap/pm/state";
import { TableMap } from "@tiptap/pm/tables";

import { findTable } from "./query";
import type { CellPos } from "./types";

/**
 * Returns an array of cells in a row(s), where `rowIndex` could be a row index or an array of row indexes.
 *
 * @internal
 */
export function getCellsInRow(
  rowIndex: number | number[],
  selection: Selection,
): CellPos[] | undefined {
  const table = findTable(selection.$from);
  if (!table) {
    return;
  }

  const map = TableMap.get(table.node);
  const indexes = Array.isArray(rowIndex) ? rowIndex : [rowIndex];

  return indexes
    .filter((index) => index >= 0 && index <= map.height - 1)
    .flatMap((index) => {
      const cells = map.cellsInRect({
        bottom: index + 1,
        left: 0,
        right: map.width,
        top: index,
      });
      return cells.map((nodePos) => {
        const node = table.node.nodeAt(nodePos)!;
        const pos = nodePos + table.start;
        return { depth: table.depth + 2, node, pos, start: pos + 1 };
      });
    });
}
