/* eslint-disable */
import React from "react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { ColorSwatch, Menu } from "@mantine/core";
import { TABLE_COLORS } from "../../table-background-color";
import {
  IconArrowDown,
  IconArrowUp,
  IconEraser,
  IconPalette,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconRowRemove,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useTableMoveRowColumn } from "../hooks/use-table-move-row-column";
import { useTableClear } from "../hooks/use-table-clear";
import { setTableBackground } from "../set-table-background";
import { AlignmentSubmenu } from "./alignment-submenu";

interface RowHandleMenuProps {
  editor: Editor;
  index: number;
  tableNode: ProseMirrorNode;
  tablePos: number;
}

export const RowHandleMenu = React.memo(function RowHandleMenu({
  editor,
  index,
  tableNode,
  tablePos,
}: RowHandleMenuProps) {
  const { t } = useTranslation();

  const moveUp = useTableMoveRowColumn(editor, "row", index, "up", tableNode, tablePos);
  const moveDown = useTableMoveRowColumn(editor, "row", index, "down", tableNode, tablePos);
  const clearRow = useTableClear(editor, tableNode, tablePos, {
    index,
    kind: "row",
  });

  return (
    <>
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
        leftSection={<IconRowInsertTop size={12} />}
        onClick={() => editor.chain().focus().addRowBefore().run()}
      >
        {t("Add row above")}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconRowInsertBottom size={12} />}
        onClick={() => editor.chain().focus().addRowAfter().run()}
      >
        {t("Add row below")}
      </Menu.Item>

      <Menu.Divider />

      <Menu.Item leftSection={<IconEraser size={12} />} onClick={clearRow}>
        {t("Clear cells")}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconRowRemove size={12} />}
        onClick={() => editor.chain().focus().deleteRow().run()}
      >
        {t("Delete row")}
      </Menu.Item>

      <Menu.Divider />

      <Menu.Item
        leftSection={<IconArrowUp size={12} />}
        onClick={moveUp.handleMove}
        disabled={!moveUp.canMove}
      >
        {t("Move row up")}
      </Menu.Item>
      <Menu.Item
        leftSection={<IconArrowDown size={12} />}
        onClick={moveDown.handleMove}
        disabled={!moveDown.canMove}
      >
        {t("Move row down")}
      </Menu.Item>
    </>
  );
});
