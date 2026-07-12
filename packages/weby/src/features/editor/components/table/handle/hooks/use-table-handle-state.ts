/* eslint-disable */
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import type { TableHandleState } from "#/features/editor/extensions/table";
import { TableDndKey } from "#/features/editor/extensions/table";

const FALLBACK: TableHandleState = {
  dragging: null,
  frozen: false,
  hoveringCell: null,
  tableNode: null,
  tablePos: null,
};

export function useTableHandleState(editor: Editor | null): TableHandleState {
  const state = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {return null;}
      return TableDndKey.getState(ctx.editor.state) ?? null;
    },
  });

  return state ?? FALLBACK;
}
