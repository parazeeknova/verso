import { BubbleMenu as BaseBubbleMenu } from "@tiptap/react/menus";
import { findParentNode, posToDOMRect, useEditorState } from "@tiptap/react";
import React, { useCallback, useRef } from "react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { isEditorReady } from "#/features/editor/extensions/table";
import { ActionIcon, Tooltip } from "@mantine/core";
import { clsx } from "clsx";
import {
  IconLayoutAlignCenter,
  IconLayoutAlignLeft,
  IconLayoutAlignRight,
  IconDownload,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { uploadVideo } from "./upload-video";
import { useAltTextControl } from "../common/use-alt-text-control";
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

export const VideoMenu = ({ editor }: EditorMenuProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return null;
      }

      const videoAttrs = ctx.editor.getAttributes("video");
      const align = videoAttrs?.align || "center";

      return {
        alt: videoAttrs?.alt || "",
        isAlignCenter: align === "center",
        isAlignLeft: align === "left",
        isAlignRight: align === "right",
        isVideo: ctx.editor.isActive("video"),
        src: videoAttrs?.src || null,
      };
    },
  });

  const shouldShow = useCallback(
    ({ state }: ShouldShowProps) => {
      if (!state || !isEditorReady(editor)) {
        return false;
      }

      return editor.isActive("video") && editor.getAttributes("video").src;
    },
    [editor],
  );

  const getReferencedVirtualElement = useCallback(() => {
    if (!isEditorReady(editor)) {
      return null;
    }
    const { selection } = editor.state;
    const predicate = (node: PMNode) => node.type.name === "video";
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

  const alignVideoLeft = useCallback(() => {
    editor.chain().focus(undefined, { scrollIntoView: false }).setVideoAlign("left").run();
  }, [editor]);

  const alignVideoCenter = useCallback(() => {
    editor.chain().focus(undefined, { scrollIntoView: false }).setVideoAlign("center").run();
  }, [editor]);

  const alignVideoRight = useCallback(() => {
    editor.chain().focus(undefined, { scrollIntoView: false }).setVideoAlign("right").run();
  }, [editor]);

  const handleDownload = useCallback(() => {
    if (!editorState?.src) {
      return;
    }
    const a = document.createElement("a");
    a.href = editorState.src;
    a.download = "";
    a.click();
  }, [editorState?.src]);

  const handleReplace = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }

      const pos = editor.state.selection.from;
      // Capture the existing node's attributes before it is removed so the
      // replacement can preserve them.
      const videoAttrs = editor.getAttributes("video");
      const alt = videoAttrs?.alt;
      const align = videoAttrs?.align;
      editor.commands.deleteSelection();
      uploadVideo(file, editor, pos, { align, alt });
      // Reset so the same file can be selected again
      e.target.value = "";
    },
    [editor],
  );

  const handleDelete = useCallback(() => {
    editor.commands.deleteSelection();
  }, [editor]);

  const {
    button: altTextButton,
    panel: altTextPanel,
    isEditing: isEditingAlt,
  } = useAltTextControl({
    currentAlt: editorState?.alt || "",
    editor,
    nodeName: "video",
  });

  return (
    <BaseBubbleMenu
      editor={editor}
      pluginKey={`video-menu`}
      updateDelay={0}
      getReferencedVirtualElement={getReferencedVirtualElement}
      options={{
        flip: false,
        offset: 8,
        placement: "top",
      }}
      shouldShow={shouldShow}
    >
      {isEditingAlt ? (
        altTextPanel
      ) : (
        <div className={classes.toolbar}>
          <Tooltip position="top" label={t("Align left")} withinPortal={false}>
            <ActionIcon
              onClick={alignVideoLeft}
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
              onClick={alignVideoCenter}
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
              onClick={alignVideoRight}
              size="sm"
              aria-label={t("Align right")}
              variant="subtle"
              className={clsx({ [classes.active]: editorState?.isAlignRight })}
            >
              <IconLayoutAlignRight size={14} />
            </ActionIcon>
          </Tooltip>

          <div className={classes.divider} />

          {altTextButton}

          <div className={classes.divider} />

          <Tooltip position="top" label={t("Download")} withinPortal={false}>
            <ActionIcon
              onClick={handleDownload}
              size="sm"
              aria-label={t("Download")}
              variant="subtle"
            >
              <IconDownload size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip position="top" label={t("Replace video")} withinPortal={false}>
            <ActionIcon
              onClick={handleReplace}
              size="sm"
              aria-label={t("Replace video")}
              variant="subtle"
            >
              <IconRefresh size={14} />
            </ActionIcon>
          </Tooltip>

          <Tooltip position="top" label={t("Delete")} withinPortal={false}>
            <ActionIcon onClick={handleDelete} size="sm" aria-label={t("Delete")} variant="subtle">
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </BaseBubbleMenu>
  );
};

export default VideoMenu;
