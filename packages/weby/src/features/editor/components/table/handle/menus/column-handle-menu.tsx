/* eslint-disable */
import React from "react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { ColorSwatch, Menu } from "@mantine/core";
import { TABLE_COLORS } from "../../table-background-color";
import {
  IconArrowLeft,
  IconArrowRight,
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconColumnRemove,
  IconEraser,
  IconPalette,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useTableMoveRowColumn } from "../hooks/use-table-move-row-column";
import { useTableClear } from "../hooks/use-table-clear";
import { useTableSort } from "../hooks/use-table-sort";
import { setTableBackground } from "../set-table-background";
import { AlignmentSubmenu } from "./alignment-submenu";

interface ColumnHandleMenuProps {
  editor: Editor;
  index: number;
  tableNode: ProseMirrorNode;
  tablePos: number;
}

export const ColumnHandleMenu = React.memo(function ColumnHandleMenu({
  editor,
  index,
  tableNode,
  tablePos,
}: ColumnHandleMenuProps) {
  const { t } = useTranslation();

  const moveLeft = useTableMoveRowColumn(editor, "col", index, "left", tableNode, tablePos);
  const moveRight = useTableMoveRowColumn(editor, "col", index, "right", tableNode, tablePos);
  const clearCol = useTableClear(editor, tableNode, tablePos, {
    index,
    kind: "col",
  });

  const sortAsc = useTableSort({
    direction: "asc",
    editor,
    index,
    orientation: "col",
    tableNode,
    tablePos,
  });
  const sortDesc = useTableSort({
    direction: "desc",
    editor,
    index,
    orientation: "col",
    tableNode,
    tablePos,
  });

  return (
    <>
      <Menu.Item
        leftSection={<IconSortAscendingLetters size={12} />}
        onClick={sortAsc.handleSort}
        disabled={!sortAsc.canSort}
      >
        {t("Sort A → Z")}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconSortDescendingLetters size={12} />}
        onClick={sortDesc.handleSort}
        disabled={!sortDesc.canSort}
      >
        {t("Sort Z → A")}
      </Menu.Item>
      <Menu.Divider />

      <Menu.Sub position="right-start">
        <Menu.Sub.Target>
          <Menu.Sub.Item leftSection={<IconPalette size={12} />}>
            {t("Background color")}
          </Menu.Sub.Item>
        </Menu.Sub.Target>
        <Menu.Sub.Dropdown>
          <div
            style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(4, 1fr)", padding: 8 }}
          >
            {TABLE_COLORS.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setTableBackground(editor, c.color, c.name)}
                aria-label={t(c.name)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <ColorSwatch
                  color={c.color || "#ffffff"}
                  size={22}
                  style={{ border: c.color === "" ? "1px solid var(--color-border)" : undefined }}
                />
              </button>
            ))}
          </div>
        </Menu.Sub.Dropdown>
      </Menu.Sub>

      <AlignmentSubmenu editor={editor} />

      <Menu.Divider />

      <Menu.Item
        leftSection={<IconColumnInsertLeft size={12} />}
        onClick={() => editor.chain().focus().addColumnBefore().run()}
      >
        {t("Add column left")}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconColumnInsertRight size={12} />}
        onClick={() => editor.chain().focus().addColumnAfter().run()}
      >
        {t("Add column right")}
      </Menu.Item>

      <Menu.Divider />

      <Menu.Item leftSection={<IconEraser size={12} />} onClick={clearCol}>
        {t("Clear cells")}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconColumnRemove size={12} />}
        onClick={() => editor.chain().focus().deleteColumn().run()}
      >
        {t("Delete column")}
      </Menu.Item>

      <Menu.Divider />

      <Menu.Item
        leftSection={<IconArrowLeft size={12} />}
        onClick={moveLeft.handleMove}
        disabled={!moveLeft.canMove}
      >
        {t("Move column left")}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconArrowRight size={12} />}
        onClick={moveRight.handleMove}
        disabled={!moveRight.canMove}
      >
        {t("Move column right")}
      </Menu.Item>
    </>
  );
});
