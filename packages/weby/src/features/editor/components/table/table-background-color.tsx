/* eslint-disable */
import type { FC } from "react";
import React from "react";
import { IconCheck, IconPalette } from "@tabler/icons-react";
import {
  ActionIcon,
  ColorSwatch,
  Popover,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { setTableBackground } from "./handle/set-table-background";

export interface TableColorItem {
  name: string;
  color: string;
}

interface TableBackgroundColorProps {
  editor: Editor | null;
}

export const TABLE_COLORS: TableColorItem[] = [
  { color: "", name: "Default" },
  { color: "#b4d5ff", name: "Blue" },
  { color: "#acf5d2", name: "Green" },
  { color: "#fef1b4", name: "Yellow" },
  { color: "#ffbead", name: "Red" },
  { color: "#ffc7fe", name: "Pink" },
  { color: "#eaecef", name: "Gray" },
  { color: "#c1b7f2", name: "Purple" },
];

function isLightColor(hex: string): boolean {
  if (!hex) {
    return true;
  }
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5;
}

export const TableBackgroundColor: FC<TableBackgroundColorProps> = ({ editor }) => {
  const { t } = useTranslation();
  const [opened, setOpened] = React.useState(false);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return null;
      }

      let currentColor = "";
      if (ctx.editor.isActive("tableCell")) {
        const attrs = ctx.editor.getAttributes("tableCell");
        currentColor = attrs.backgroundColor || "";
      } else if (ctx.editor.isActive("tableHeader")) {
        const attrs = ctx.editor.getAttributes("tableHeader");
        currentColor = attrs.backgroundColor || "";
      }

      return {
        currentColor,
        isTableCell: ctx.editor.isActive("tableCell"),
        isTableHeader: ctx.editor.isActive("tableHeader"),
      };
    },
  });

  if (!editor || !editorState) {
    return null;
  }

  const setTableCellBackground = (color: string, colorName: string) => {
    setTableBackground(editor, color, colorName);
    setOpened(false);
  };

  return (
    <Popover
      width={200}
      position="bottom"
      opened={opened}
      onChange={setOpened}
      withArrow
      transitionProps={{ transition: "pop" }}
    >
      <Popover.Target>
        <Tooltip label={t("Background color")} withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            aria-label={t("Background color")}
            onClick={() => setOpened(!opened)}
          >
            <IconPalette size={14} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            {t("Background color")}
          </Text>

          <div
            style={{
              display: "grid",
              gap: "8px",
              gridTemplateColumns: "repeat(4, 1fr)",
            }}
          >
            {TABLE_COLORS.map((item, index) => (
              <UnstyledButton
                key={index}
                onClick={() => setTableCellBackground(item.color, item.name)}
                style={{
                  height: "24px",
                  position: "relative",
                  width: "24px",
                }}
                title={t(item.name)}
              >
                <ColorSwatch
                  color={item.color || "#ffffff"}
                  size={24}
                  style={{
                    border: item.color === "" ? "1px solid var(--color-border)" : undefined,
                    cursor: "pointer",
                  }}
                >
                  {editorState.currentColor === item.color && (
                    <IconCheck
                      size={18}
                      style={{
                        color: isLightColor(item.color) ? "#000000" : "#ffffff",
                      }}
                    />
                  )}
                </ColorSwatch>
              </UnstyledButton>
            ))}
          </div>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
