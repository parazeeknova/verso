import { BubbleMenu as BaseBubbleMenu } from "@tiptap/react/menus";
import { findParentNode, posToDOMRect, useEditorState } from "@tiptap/react";
import { useCallback } from "react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { ActionIcon, Tooltip } from "@mantine/core";
import { clsx } from "clsx";
import {
  IconInfoCircle,
  IconCheck,
  IconExclamationCircle,
  IconAlertCircle,
  IconTrash,
} from "@tabler/icons-react";
import { isEditorReady, isTextSelected } from "#/features/editor/extensions/table";
import type { CalloutType } from "./callout-view";
import { useTranslation } from "react-i18next";
import classes from "../common/toolbar-menu.module.css";
import type { Editor } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export interface EditorMenuProps {
  editor: Editor;
}

export interface ShouldShowProps {
  state: EditorState;
  view: EditorView;
  from: number;
  to: number;
}

export const CalloutMenu = ({ editor }: EditorMenuProps) => {
  const { t } = useTranslation();

  const shouldShow = useCallback(
    ({ state }: ShouldShowProps) => {
      if (!state || !isEditorReady(editor)) {
        return false;
      }
      if (isTextSelected(editor)) {
        return false;
      }
      return editor.isActive("callout");
    },
    [editor],
  );

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return null;
      }

      return {
        isCallout: ctx.editor.isActive("callout"),
        isDanger: ctx.editor.isActive("callout", { type: "danger" }),
        isInfo: ctx.editor.isActive("callout", { type: "info" }),
        isSuccess: ctx.editor.isActive("callout", { type: "success" }),
        isWarning: ctx.editor.isActive("callout", { type: "warning" }),
      };
    },
  });

  const getReferencedVirtualElement = useCallback(() => {
    if (!isEditorReady(editor)) {
      return null;
    }
    const { selection } = editor.state;
    const predicate = (node: PMNode) => node.type.name === "callout";
    const parent = findParentNode(predicate)(selection);

    if (parent) {
      const dom = editor.view.nodeDOM(parent?.pos) as HTMLElement;
      if (dom) {
        const domRect = dom.getBoundingClientRect();
        return {
          getBoundingClientRect: () => domRect,
          getClientRects: () => [domRect],
        };
      }
    }

    const domRect = posToDOMRect(editor.view, selection.from, selection.to);
    return {
      getBoundingClientRect: () => domRect,
      getClientRects: () => [domRect],
    };
  }, [editor]);

  const setCalloutType = useCallback(
    (calloutType: CalloutType) => {
      editor
        .chain()
        .focus(undefined, { scrollIntoView: false })
        .updateAttributes("callout", { type: calloutType })
        .run();
    },
    [editor],
  );

  const handleDelete = useCallback(() => {
    const parent = findParentNode((node: PMNode) => node.type.name === "callout")(
      editor.state.selection,
    );
    if (!parent) {
      return;
    }
    editor.chain().focus().setNodeSelection(parent.pos).deleteSelection().run();
  }, [editor]);

  return (
    <BaseBubbleMenu
      editor={editor}
      pluginKey="callout-menu"
      updateDelay={0}
      getReferencedVirtualElement={getReferencedVirtualElement}
      options={{
        flip: false,
        placement: "bottom",
      }}
      shouldShow={shouldShow}
    >
      <div className={classes.toolbar}>
        <Tooltip position="top" label={t("Info")} withinPortal={false}>
          <ActionIcon
            onClick={() => setCalloutType("info")}
            size="sm"
            aria-label={t("Info")}
            variant="subtle"
            className={clsx({ [classes.active]: editorState?.isInfo })}
          >
            <IconInfoCircle size={14} color="var(--mantine-color-blue-5)" />
          </ActionIcon>
        </Tooltip>

        <Tooltip position="top" label={t("Success")} withinPortal={false}>
          <ActionIcon
            onClick={() => setCalloutType("success")}
            size="sm"
            aria-label={t("Success")}
            variant="subtle"
            className={clsx({ [classes.active]: editorState?.isSuccess })}
          >
            <IconCheck size={14} color="var(--mantine-color-green-5)" />
          </ActionIcon>
        </Tooltip>

        <Tooltip position="top" label={t("Warning")} withinPortal={false}>
          <ActionIcon
            onClick={() => setCalloutType("warning")}
            size="sm"
            aria-label={t("Warning")}
            variant="subtle"
            className={clsx({ [classes.active]: editorState?.isWarning })}
          >
            <IconExclamationCircle size={14} color="var(--mantine-color-yellow-5)" />
          </ActionIcon>
        </Tooltip>

        <Tooltip position="top" label={t("Danger")} withinPortal={false}>
          <ActionIcon
            onClick={() => setCalloutType("danger")}
            size="sm"
            aria-label={t("Danger")}
            variant="subtle"
            className={clsx({ [classes.active]: editorState?.isDanger })}
          >
            <IconAlertCircle size={14} color="var(--mantine-color-red-5)" />
          </ActionIcon>
        </Tooltip>

        <div className={classes.divider} />

        <Tooltip position="top" label={t("Delete")} withinPortal={false}>
          <ActionIcon onClick={handleDelete} size="sm" aria-label={t("Delete")} variant="subtle">
            <IconTrash size={14} />
          </ActionIcon>
        </Tooltip>
      </div>
    </BaseBubbleMenu>
  );
};

export default CalloutMenu;
