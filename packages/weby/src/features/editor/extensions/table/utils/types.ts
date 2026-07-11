/* eslint-disable */
import type { Node, ResolvedPos } from "@tiptap/pm/model";

export interface CellPos {
  pos: number;
  start: number;
  depth: number;
  node: Node;
}

export interface CellSelectionRange {
  $anchor: ResolvedPos;
  $head: ResolvedPos;
  // an array of column/row indexes
  indexes: number[];
}
