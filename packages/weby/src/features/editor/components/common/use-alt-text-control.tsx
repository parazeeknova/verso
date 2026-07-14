import React, { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { ActionIcon, Button, Group, Paper, Text, Textarea, Tooltip } from "@mantine/core";
import { IconAlt } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

const ALT_MAX_LENGTH = 300;

const sanitizeAlt = (value: string): string =>
  value
    .replaceAll(/[\\[\]!]/g, "")
    .replaceAll(/\s+/g, " ")
    .trim();

interface UseAltTextControlArgs {
  editor: Editor;
  nodeName: string;
  currentAlt: string;
}

export const useAltTextControl = ({ editor, nodeName, currentAlt }: UseAltTextControlArgs) => {
  const { t } = useTranslation();
  const [showInput, setShowInput] = useState(false);
  const [draft, setDraft] = useState("");

  const open = useCallback(() => {
    setDraft(currentAlt || "");
    setShowInput(true);
  }, [currentAlt]);

  useEffect(() => {
    const handler = () => {
      if (!editor.isActive(nodeName)) {
        setShowInput(false);
      }
    };
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("selectionUpdate", handler);
    };
  }, [editor, nodeName]);

  const cancel = useCallback(() => {
    setShowInput(false);
  }, []);

  const save = useCallback(() => {
    editor
      .chain()
      .focus(undefined, { scrollIntoView: false })
      .updateAttributes(nodeName, { alt: sanitizeAlt(draft) || undefined })
      .run();
    setShowInput(false);
  }, [editor, nodeName, draft]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        save();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    },
    [save, cancel],
  );

  const button = (
    <Tooltip position="top" label={t("Alt text")} withinPortal={false}>
      <ActionIcon onClick={open} size="sm" aria-label={t("Alt text")} variant="subtle">
        <IconAlt size={14} />
      </ActionIcon>
    </Tooltip>
  );

  const panel = showInput ? (
    <Paper
      withBorder
      shadow="md"
      radius={0}
      p="xs"
      w={240}
      style={{ position: "relative", zIndex: 100 }}
    >
      <Text size="xs" fw={600} mb={6}>
        {t("Alt text")}
      </Text>
      <Textarea
        size="xs"
        placeholder={t("Add description...")}
        value={draft}
        onChange={(e) => setDraft(e.currentTarget.value)}
        onKeyDown={onKeyDown}
        autoFocus
        autosize
        minRows={1}
        maxRows={4}
        maxLength={ALT_MAX_LENGTH}
        radius={0}
        styles={{
          input: {
            "&:focus": {
              borderColor: "#b58cff",
            },
            "&:focus-within": {
              borderColor: "#b58cff",
            },
          },
        }}
      />
      <Group justify="space-between" align="center" mt={6} wrap="nowrap">
        <Text size="10px" c="dimmed">
          {draft.length}/{ALT_MAX_LENGTH}
        </Text>
        <Group gap={4}>
          <Button size="compact-xs" variant="default" onClick={cancel} radius={0}>
            {t("Cancel")}
          </Button>
          <Button
            size="compact-xs"
            onClick={save}
            radius={0}
            className="bg-[#b58cff] hover:bg-[#a37bfa] text-white border-none"
          >
            {t("Save")}
          </Button>
        </Group>
      </Group>
    </Paper>
  ) : null;

  return { button, isEditing: showInput, panel };
};
