import { BubbleMenu as BaseBubbleMenu } from "@tiptap/react/menus";
import { findParentNode, posToDOMRect, useEditorState } from "@tiptap/react";
import { useCallback } from "react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { isEditorReady } from "#/features/editor/extensions/table";
import { ActionIcon, Tooltip } from "@mantine/core";
import { clsx } from "clsx";
import {
  IconLayoutAlignCenter,
  IconLayoutAlignLeft,
  IconLayoutAlignRight,
  IconTrash,
} from "@tabler/icons-react";
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

export const YoutubeMenu = ({ editor }: EditorMenuProps) => {
  const { t } = useTranslation();

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return null;
      }

      const youtubeAttrs = ctx.editor.getAttributes("youtube");
      const align = youtubeAttrs?.align || "center";

      return {
        isAlignCenter: align === "center",
        isAlignLeft: align === "left",
        isAlignRight: align === "right",
        isYoutube: ctx.editor.isActive("youtube"),
        src: youtubeAttrs?.src || null,
      };
    },
  });

  const shouldShow = useCallback(
    ({ state }: ShouldShowProps) => {
      if (!state || !isEditorReady(editor)) {
        return false;
      }

      return editor.isActive("youtube") && editor.getAttributes("youtube").src;
    },
    [editor],
  );

  const getReferencedVirtualElement = useCallback(() => {
    if (!isEditorReady(editor)) {
      return null;
    }
    const { selection } = editor.state;
    const predicate = (node: PMNode) => node.type.name === "youtube";
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

  const alignYoutubeLeft = useCallback(() => {
    editor
      .chain()
      .focus(undefined, { scrollIntoView: false })
      .updateAttributes("youtube", { align: "left" })
      .run();
  }, [editor]);

  const alignYoutubeCenter = useCallback(() => {
    editor
      .chain()
      .focus(undefined, { scrollIntoView: false })
      .updateAttributes("youtube", { align: "center" })
      .run();
  }, [editor]);

  const alignYoutubeRight = useCallback(() => {
    editor
      .chain()
      .focus(undefined, { scrollIntoView: false })
      .updateAttributes("youtube", { align: "right" })
      .run();
  }, [editor]);

  const handleDelete = useCallback(() => {
    editor.commands.deleteSelection();
  }, [editor]);

  return (
    <BaseBubbleMenu
      editor={editor}
      pluginKey={`youtube-menu`}
      updateDelay={0}
      getReferencedVirtualElement={getReferencedVirtualElement}
      options={{
        flip: false,
        offset: 8,
        placement: "top",
      }}
      shouldShow={shouldShow}
    >
      <div className={classes.toolbar}>
        <Tooltip position="top" label={t("Align left")} withinPortal={false}>
          <ActionIcon
            onClick={alignYoutubeLeft}
            size="sm"
            aria-label={t("Align left")}
            variant="subtle"
            className={clsx({ [classes.active]: editorState?.isAlignLeft })}
          >
            <IconLayoutAlignLeft size={14} />
          </ActionIcon>
        </Tooltip>

        <Tooltip position="top" label={t("Align center")} withinPortal={false}>
          <ActionIcon
            onClick={alignYoutubeCenter}
            size="sm"
            aria-label={t("Align center")}
            variant="subtle"
            className={clsx({ [classes.active]: editorState?.isAlignCenter })}
          >
            <IconLayoutAlignCenter size={14} />
          </ActionIcon>
        </Tooltip>

        <Tooltip position="top" label={t("Align right")} withinPortal={false}>
          <ActionIcon
            onClick={alignYoutubeRight}
            size="sm"
            aria-label={t("Align right")}
            variant="subtle"
            className={clsx({ [classes.active]: editorState?.isAlignRight })}
          >
            <IconLayoutAlignRight size={14} />
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

export default YoutubeMenu;
