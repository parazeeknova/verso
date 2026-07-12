/* eslint-disable */
import { posToDOMRect, findParentNode } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import React, { useCallback } from 'react';
import type { JSX } from 'react';
import type { EditorMenuProps, ShouldShowProps } from "./types/types";
import { ActionIcon, Tooltip } from "@mantine/core";
import {
  IconColumnInsertLeft,
  IconColumnInsertRight,
  IconColumnRemove,
  IconRowInsertBottom,
  IconRowInsertTop,
  IconRowRemove,
  IconTableColumn,
  IconTableRow,
  IconTrashX,
} from "@tabler/icons-react";
import { BubbleMenu } from "@tiptap/react/menus";
import { isCellSelection, isEditorReady, isTextSelected } from "#/features/editor/extensions/table";
import { useTranslation } from "react-i18next";
import classes from "../common/toolbar-menu.module.css";

export const TableMenu = React.memo(({ editor }: EditorMenuProps): JSX.Element => {
  const { t } = useTranslation();
  const shouldShow = useCallback(
    ({ state }: ShouldShowProps) => {
      if (!state) {
        return false;
      }

      if (isTextSelected(editor)) {return false;}
      return editor.isActive("table") && !isCellSelection(state.selection);
    },
    [editor],
  );

  const getReferencedVirtualElement = useCallback(() => {
    if (!isEditorReady(editor)) return null;
    const { selection } = editor.state;
    const predicate = (node: PMNode) => node.type.name === "table";
    const parent = findParentNode(predicate)(selection);

    if (parent) {
      const dom = editor.view.nodeDOM(parent?.pos) as HTMLElement | null;
      if (!dom) {
        const rect = posToDOMRect(editor.view, selection.from, selection.to);
        return {
          getBoundingClientRect: () => rect,
          getClientRects: () => [rect],
        };
      }
      const rect = dom.getBoundingClientRect();
      return {
        getBoundingClientRect: () => rect,
        getClientRects: () => [rect],
      };
    }

    const rect = posToDOMRect(editor.view, selection.from, selection.to);
    return {
      getBoundingClientRect: () => rect,
      getClientRects: () => [rect],
    };
  }, [editor]);

  const toggleHeaderColumn = useCallback(() => {
    editor.chain().focus().toggleHeaderColumn().run();
  }, [editor]);

  const toggleHeaderRow = useCallback(() => {
    editor.chain().focus().toggleHeaderRow().run();
  }, [editor]);

  const addColumnLeft = useCallback(() => {
    editor.chain().focus().addColumnBefore().run();
  }, [editor]);

  const addColumnRight = useCallback(() => {
    editor.chain().focus().addColumnAfter().run();
  }, [editor]);

  const deleteColumn = useCallback(() => {
    editor.chain().focus().deleteColumn().run();
  }, [editor]);

  const addRowAbove = useCallback(() => {
    editor.chain().focus().addRowBefore().run();
  }, [editor]);

  const addRowBelow = useCallback(() => {
    editor.chain().focus().addRowAfter().run();
  }, [editor]);

  const deleteRow = useCallback(() => {
    editor.chain().focus().deleteRow().run();
  }, [editor]);

  const deleteTable = useCallback(() => {
    editor.chain().focus().deleteTable().run();
  }, [editor]);

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="table-menu"
      resizeDelay={0}
      getReferencedVirtualElement={getReferencedVirtualElement}
      ref={(element) => {
        if (element) {
          element.style.zIndex = "99";
        }
      }}
      options={{
        flip: {
          boundary: editor.options.element as HTMLElement,
          fallbackPlacements: ["bottom", "top"],
          padding: { bottom: -Infinity, left: 8, right: 8, top: 35 + 15 },
        },
        offset: {
          mainAxis: 15,
        },
        placement: "bottom",
        shift: {
          crossAxis: true,
          padding: 8 + 15,
        },
      }}
      shouldShow={shouldShow}
    >
      <div className={classes.toolbar}>
        <Tooltip position="top" label={t("Add left column")} withinPortal={false}>
          <ActionIcon
            onClick={addColumnLeft}
            variant="subtle"
            size="sm"
            aria-label={t("Add left column")}
          >
            <IconColumnInsertLeft size={14} />
          </ActionIcon>
        </Tooltip>

        <Tooltip position="top" label={t("Add right column")} withinPortal={false}>
          <ActionIcon
            onClick={addColumnRight}
            variant="subtle"
            size="sm"
            aria-label={t("Add right column")}
          >
            <IconColumnInsertRight size={14} />
          </ActionIcon>
        </Tooltip>

        <Tooltip position="top" label={t("Delete column")} withinPortal={false}>
          <ActionIcon
            onClick={deleteColumn}
            variant="subtle"
            size="sm"
            aria-label={t("Delete column")}
          >
            <IconColumnRemove size={14} />
          </ActionIcon>
        </Tooltip>

        <div className={classes.divider} />

        <Tooltip position="top" label={t("Add row above")} withinPortal={false}>
          <ActionIcon
            onClick={addRowAbove}
            variant="subtle"
            size="sm"
            aria-label={t("Add row above")}
          >
            <IconRowInsertTop size={14} />
          </ActionIcon>
        </Tooltip>

        <Tooltip position="top" label={t("Add row below")} withinPortal={false}>
          <ActionIcon
            onClick={addRowBelow}
            variant="subtle"
            size="sm"
            aria-label={t("Add row below")}
          >
            <IconRowInsertBottom size={14} />
          </ActionIcon>
        </Tooltip>

        <Tooltip position="top" label={t("Delete row")} withinPortal={false}>
          <ActionIcon onClick={deleteRow} variant="subtle" size="sm" aria-label={t("Delete row")}>
            <IconRowRemove size={14} />
          </ActionIcon>
        </Tooltip>

        <div className={classes.divider} />

        <Tooltip position="top" label={t("Toggle header row")} withinPortal={false}>
          <ActionIcon
            onClick={toggleHeaderRow}
            variant="subtle"
            size="sm"
            aria-label={t("Toggle header row")}
          >
            <IconTableRow size={14} />
          </ActionIcon>
        </Tooltip>

        <Tooltip position="top" label={t("Toggle header column")} withinPortal={false}>
          <ActionIcon
            onClick={toggleHeaderColumn}
            variant="subtle"
            size="sm"
            aria-label={t("Toggle header column")}
          >
            <IconTableColumn size={14} />
          </ActionIcon>
        </Tooltip>

        <div className={classes.divider} />

        <Tooltip position="top" label={t("Delete table")} withinPortal={false}>
          <ActionIcon
            onClick={deleteTable}
            variant="subtle"
            size="sm"
            aria-label={t("Delete table")}
          >
            <IconTrashX size={14} />
          </ActionIcon>
        </Tooltip>
      </div>
    </BubbleMenu>
  );
});

export default TableMenu;
