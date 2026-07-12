import { BubbleMenu as BaseBubbleMenu } from "@tiptap/react/menus";
import { findParentNode, posToDOMRect, useEditorState } from "@tiptap/react";
import React, { useCallback, useRef, useState } from "react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { DOMSerializer } from "@tiptap/pm/model";
import { ActionIcon, Tooltip, Popover, Button, rem } from "@mantine/core";
import { clsx } from "clsx";
import {
  IconChevronDown,
  IconCheck,
  IconColumns2,
  IconColumns3,
  IconLayoutSidebar,
  IconLayoutSidebarRight,
  IconLayoutAlignCenter,
  IconCopy,
  IconTrash,
} from "@tabler/icons-react";
import { isEditorReady, isTextSelected } from "#/features/editor/extensions/table";
import type { ColumnsLayout } from "#/features/editor/extensions/columns";
import { useTranslation } from "react-i18next";
import classes from "../common/toolbar-menu.module.css";
import colClasses from "./columns-menu.module.css";
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

interface LayoutPreset {
  layout: ColumnsLayout;
  label: string;
  icon: React.ElementType;
}

interface IconProps {
  size?: number | string;
  stroke?: number;
}

export const IconColumns4 = ({ size = 24, stroke = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={rem(size)}
    height={rem(size)}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 4a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v16a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-16" />
    <path d="M7.5 3v18" />
    <path d="M12 3v18" />
    <path d="M16.5 3v18" />
  </svg>
);

export const IconColumns5 = ({ size = 24, stroke = 2 }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={rem(size)}
    height={rem(size)}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 4a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v16a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-16" />
    <path d="M6.6 3v18" />
    <path d="M10.2 3v18" />
    <path d="M13.8 3v18" />
    <path d="M17.4 3v18" />
  </svg>
);

const twoColumnPresets: LayoutPreset[] = [
  { icon: IconColumns2, label: "Equal columns", layout: "two_equal" },
  {
    icon: IconLayoutSidebar,
    label: "Left sidebar",
    layout: "two_left_sidebar",
  },
  {
    icon: IconLayoutSidebarRight,
    label: "Right sidebar",
    layout: "two_right_sidebar",
  },
];

const threeColumnPresets: LayoutPreset[] = [
  { icon: IconColumns3, label: "Equal columns", layout: "three_equal" },
  {
    icon: IconLayoutAlignCenter,
    label: "Wide center",
    layout: "three_with_sidebars",
  },
  {
    icon: IconLayoutSidebarRight,
    label: "Left wide",
    layout: "three_left_wide",
  },
  { icon: IconLayoutSidebar, label: "Right wide", layout: "three_right_wide" },
];

const getPresetsForCount = (count: number): LayoutPreset[] => {
  if (count === 2) {
    return twoColumnPresets;
  }
  if (count === 3) {
    return threeColumnPresets;
  }
  return [];
};

const NODES_WITH_MENUS = ["callout", "image", "video", "drawio", "excalidraw", "table"];

export const ColumnsMenu = ({ editor }: EditorMenuProps) => {
  const { t } = useTranslation();
  const [isCountOpen, setIsCountOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldShow = useCallback(
    ({ state }: ShouldShowProps) => {
      if (!state || !isEditorReady(editor)) {
        return false;
      }
      if (!editor.isActive("columns")) {
        return false;
      }
      if (isTextSelected(editor)) {
        return false;
      }
      if (NODES_WITH_MENUS.some((name) => editor.isActive(name))) {
        return false;
      }

      const parent = findParentNode((node: PMNode) => node.type.name === "columns")(
        state.selection,
      );
      if (!parent) {
        return false;
      }

      const dom = editor.view.nodeDOM(parent.pos) as HTMLElement;
      if (!dom) {
        return false;
      }

      const rect = dom.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    },
    [editor],
  );

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return null;
      }

      const { selection } = ctx.editor.state;
      const parent = findParentNode((node: PMNode) => node.type.name === "columns")(selection);

      return {
        columnCount: parent?.node.childCount || 2,
        isNormal: ctx.editor.isActive("columns", { widthMode: "normal" }),
        isWide: ctx.editor.isActive("columns", { widthMode: "wide" }),
        layout: (parent?.node.attrs.layout as ColumnsLayout) || "two_equal",
      };
    },
  });

  const getReferencedVirtualElement = useCallback(() => {
    if (!isEditorReady(editor)) {
      return null;
    }
    const { selection } = editor.state;
    const predicate = (node: PMNode) => node.type.name === "columns";
    const parent = findParentNode(predicate)(selection);

    if (parent) {
      const dom = editor.view.nodeDOM(parent?.pos) as HTMLElement;
      const domRect = dom.getBoundingClientRect();

      // Columns entirely out of viewport — return real rect so menu goes off-screen
      if (domRect.bottom <= 0 || domRect.top >= window.innerHeight) {
        return {
          getBoundingClientRect: () => domRect,
          getClientRects: () => [domRect],
        };
      }

      // Clamp bottom so menu stays within viewport when columns extend below it
      // 55px = 15px offset + ~40px menu height
      const maxBottom = window.innerHeight - 55;
      if (domRect.bottom > maxBottom) {
        const clamped = new DOMRect(domRect.x, domRect.y, domRect.width, maxBottom - domRect.y);
        return {
          getBoundingClientRect: () => clamped,
          getClientRects: () => [clamped],
        };
      }

      return {
        getBoundingClientRect: () => domRect,
        getClientRects: () => [domRect],
      };
    }

    const domRect = posToDOMRect(editor.view, selection.from, selection.to);
    return {
      getBoundingClientRect: () => domRect,
      getClientRects: () => [domRect],
    };
  }, [editor]);

  const setColumnCount = useCallback(
    (count: number) => {
      editor.chain().focus(undefined, { scrollIntoView: false }).setColumnCount(count).run();
      setIsCountOpen(false);
    },
    [editor],
  );

  const setLayout = useCallback(
    (layout: ColumnsLayout) => {
      editor.chain().focus(undefined, { scrollIntoView: false }).setColumnsLayout(layout).run();
    },
    [editor],
  );

  const handleCopy = useCallback(async () => {
    const { state } = editor;
    const parent = findParentNode((node: PMNode) => node.type.name === "columns")(state.selection);
    if (!parent) {
      return;
    }

    const serializer = DOMSerializer.fromSchema(state.schema);
    const dom = serializer.serializeNode(parent.node);
    const wrapper = document.createElement("div");
    wrapper.append(dom);

    const onSuccess = () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      setCopied(true);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    };

    const execCommandFallback = () => {
      wrapper.style.position = "fixed";
      wrapper.style.left = "-9999px";
      document.body.append(wrapper);
      const range = document.createRange();
      range.selectNodeContents(wrapper);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      document.execCommand("copy");
      sel?.removeAllRanges();
      wrapper.remove();
      editor.view.focus();
      onSuccess();
    };

    if (navigator.clipboard?.write) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([wrapper.innerHTML], { type: "text/html" }),
            "text/plain": new Blob([parent.node.textContent], {
              type: "text/plain",
            }),
          }),
        ]);
        onSuccess();
      } catch {
        execCommandFallback();
      }
    } else {
      execCommandFallback();
    }
  }, [editor]);

  const handleDelete = useCallback(() => {
    const parent = findParentNode((node: PMNode) => node.type.name === "columns")(
      editor.state.selection,
    );
    if (!parent) {
      return;
    }
    editor.chain().focus().setNodeSelection(parent.pos).deleteSelection().run();
  }, [editor]);

  const columnCount = editorState?.columnCount || 2;
  const currentLayout = editorState?.layout || "two_equal";
  const presets = getPresetsForCount(columnCount);

  return (
    <BaseBubbleMenu
      editor={editor}
      pluginKey="columns-menu"
      updateDelay={0}
      getReferencedVirtualElement={getReferencedVirtualElement}
      options={{
        flip: false,
        offset: {
          mainAxis: 5,
        },
        placement: "bottom",
      }}
      shouldShow={shouldShow}
    >
      <div className={classes.toolbar}>
        <Popover opened={isCountOpen} onChange={setIsCountOpen}>
          <Popover.Target>
            <Button
              variant="subtle"
              color="dark"
              size="compact-sm"
              className={colClasses.triggerButton}
              rightSection={<IconChevronDown size={12} />}
              onClick={() => setIsCountOpen(!isCountOpen)}
              aria-label="Column count"
            >
              {`${columnCount} Columns`}
            </Button>
          </Popover.Target>
          <Popover.Dropdown p={4} className={colClasses.popoverDropdown}>
            <Button.Group orientation="vertical">
              {[2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  variant={n === columnCount ? "light" : "subtle"}
                  color={n === columnCount ? "blue" : "dark"}
                  className={colClasses.columnButton}
                  justify="space-between"
                  fullWidth
                  rightSection={n === columnCount ? <IconCheck size={14} /> : null}
                  onClick={() => setColumnCount(n)}
                  size="xs"
                >
                  {`${n} Columns`}
                </Button>
              ))}
            </Button.Group>
          </Popover.Dropdown>
        </Popover>

        {presets.length > 0 && <div className={classes.divider} />}

        {presets.map((preset) => (
          <Tooltip key={preset.layout} position="top" label={t(preset.label)} withinPortal={false}>
            <ActionIcon
              onClick={() => setLayout(preset.layout)}
              size="lg"
              aria-label={t(preset.label)}
              variant="subtle"
              className={clsx({
                [colClasses.active]: currentLayout === preset.layout,
              })}
            >
              <preset.icon size={18} />
            </ActionIcon>
          </Tooltip>
        ))}

        <div className={classes.divider} />

        <Tooltip position="top" label={copied ? t("Copied") : t("Copy")} withinPortal={false}>
          <ActionIcon onClick={handleCopy} size="lg" aria-label={t("Copy")} variant="subtle">
            {copied ? (
              <IconCheck size={18} color="var(--mantine-color-green-6)" />
            ) : (
              <IconCopy size={18} />
            )}
          </ActionIcon>
        </Tooltip>

        <Tooltip position="top" label={t("Delete")} withinPortal={false}>
          <ActionIcon onClick={handleDelete} size="lg" aria-label={t("Delete")} variant="subtle">
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
      </div>
    </BaseBubbleMenu>
  );
};

export default ColumnsMenu;
