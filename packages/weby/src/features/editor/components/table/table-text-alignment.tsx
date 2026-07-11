/* eslint-disable */
import type { FC } from "react";
import React from "react";
import { IconAlignCenter, IconAlignLeft, IconAlignRight, IconCheck } from "@tabler/icons-react";
import { ActionIcon, Button, Popover, ScrollArea, Tooltip } from "@mantine/core";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useTranslation } from "react-i18next";

interface TableTextAlignmentProps {
  editor: Editor | null;
}

interface AlignmentItem {
  name: string;
  icon: React.ElementType;
  command: () => void;
  isActive: () => boolean;
  value: string;
}

export const TableTextAlignment: FC<TableTextAlignmentProps> = ({ editor }) => {
  const { t } = useTranslation();
  const [opened, setOpened] = React.useState(false);

  const editorState = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return null;
      }

      return {
        isAlignCenter: ctx.editor.isActive({ textAlign: "center" }),
        isAlignLeft: ctx.editor.isActive({ textAlign: "left" }),
        isAlignRight: ctx.editor.isActive({ textAlign: "right" }),
      };
    },
  });

  if (!editor || !editorState) {
    return null;
  }

  const items: AlignmentItem[] = [
    {
      command: () => editor.chain().focus().setTextAlign("left").run(),
      icon: IconAlignLeft,
      isActive: () => editorState?.isAlignLeft,
      name: "Align left",
      value: "left",
    },
    {
      command: () => editor.chain().focus().setTextAlign("center").run(),
      icon: IconAlignCenter,
      isActive: () => editorState?.isAlignCenter,
      name: "Align center",
      value: "center",
    },
    {
      command: () => editor.chain().focus().setTextAlign("right").run(),
      icon: IconAlignRight,
      isActive: () => editorState?.isAlignRight,
      name: "Align right",
      value: "right",
    },
  ];

  const activeItem = items.find((item) => item.isActive()) || items[0];

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom"
      withArrow
      transitionProps={{ transition: "pop" }}
    >
      <Popover.Target>
        <Tooltip label={t("Text align")} withArrow>
          <ActionIcon
            variant="subtle"
            size="sm"
            aria-label={t("Text align")}
            onClick={() => setOpened(!opened)}
          >
            <activeItem.icon size={14} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>

      <Popover.Dropdown>
        <ScrollArea.Autosize type="scroll" mah={300}>
          <Button.Group orientation="vertical">
            {items.map((item, index) => (
              <Button
                key={index}
                variant="default"
                leftSection={<item.icon size={12} />}
                rightSection={item.isActive() && <IconCheck size={12} />}
                justify="left"
                fullWidth
                onClick={() => {
                  item.command();
                  setOpened(false);
                }}
                style={{ border: "none" }}
              >
                {t(item.name)}
              </Button>
            ))}
          </Button.Group>
        </ScrollArea.Autosize>
      </Popover.Dropdown>
    </Popover>
  );
};
