import { BubbleMenu as BaseBubbleMenu } from "@tiptap/react/menus";
import { findParentNode, posToDOMRect, useEditorState } from "@tiptap/react";
import React, { useCallback, useRef } from "react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { isEditorReady } from "#/features/editor/extensions/table";
import { ActionIcon, Tooltip } from "@mantine/core";
import { IconDownload, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { uploadAudio } from "./upload-audio";
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

export const AudioMenu = ({ editor }: EditorMenuProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return null;
      }

      const audioAttrs = ctx.editor.getAttributes("audio");

      return {
        isAudio: ctx.editor.isActive("audio"),
        src: audioAttrs?.src || null,
      };
    },
  });

  const shouldShow = useCallback(
    ({ state }: ShouldShowProps) => {
      if (!state || !isEditorReady(editor)) {
        return false;
      }

      return editor.isActive("audio") && editor.getAttributes("audio").src;
    },
    [editor],
  );

  const getReferencedVirtualElement = useCallback(() => {
    if (!isEditorReady(editor)) {
      return null;
    }
    const { selection } = editor.state;
    const predicate = (node: PMNode) => node.type.name === "audio";
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
      editor.commands.deleteSelection();
      uploadAudio(file, editor, pos);
      // Reset so the same file can be selected again
      e.target.value = "";
    },
    [editor],
  );

  const handleDelete = useCallback(() => {
    editor.commands.deleteSelection();
  }, [editor]);

  return (
    <BaseBubbleMenu
      editor={editor}
      pluginKey={`audio-menu`}
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

        <Tooltip position="top" label={t("Replace audio")} withinPortal={false}>
          <ActionIcon
            onClick={handleReplace}
            size="sm"
            aria-label={t("Replace audio")}
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

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </BaseBubbleMenu>
  );
};

export default AudioMenu;
