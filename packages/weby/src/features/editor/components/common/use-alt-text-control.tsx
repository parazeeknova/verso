import React, { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import { ActionIcon, Tooltip } from "@mantine/core";
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

  const commit = useCallback(() => {
    editor
      .chain()
      .focus(undefined, { scrollIntoView: false })
      .updateAttributes(nodeName, { alt: sanitizeAlt(draft) || undefined })
      .run();
  }, [editor, nodeName, draft]);

  useEffect(() => {
    const handler = () => {
      if (!editor.isActive(nodeName)) {
        commit();
        setShowInput(false);
      }
    };
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("selectionUpdate", handler);
    };
  }, [editor, nodeName, commit]);

  const cancel = useCallback(() => {
    setShowInput(false);
  }, []);

  const save = useCallback(() => {
    commit();
    setShowInput(false);
  }, [commit]);

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
    <div
      className="border border-neutral-300 dark:border-neutral-800 shadow-md p-2 w-[240px] text-neutral-800 dark:text-neutral-200 relative z-50 rounded-none"
      style={{
        background: "light-dark(var(--mantine-color-body), var(--mantine-color-dark-7))",
      }}
    >
      <div className="text-[11px] font-semibold mb-1">{t("Alt text")}</div>
      <textarea
        className="w-full text-xs p-1.5 bg-transparent border border-neutral-300 dark:border-neutral-800 outline-none focus:border-[#b58cff] focus:ring-1 focus:ring-[#b58cff] resize-none rounded-none text-neutral-800 dark:text-neutral-200"
        placeholder={t("Add description...")}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        autoFocus
        rows={2}
        maxLength={ALT_MAX_LENGTH}
      />
      <div className="flex justify-between items-center mt-1.5">
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
          {draft.length}/{ALT_MAX_LENGTH}
        </span>
        <div className="flex gap-1.5">
          <button
            className="px-2.5 py-1 text-[11px] font-medium border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300 rounded-none bg-transparent"
            onClick={cancel}
            type="button"
          >
            {t("Cancel")}
          </button>
          <button
            className="px-2.5 py-1 text-[11px] font-medium bg-[#b58cff] hover:bg-[#a37bfa] text-white transition-colors border-none rounded-none"
            onClick={save}
            type="button"
          >
            {t("Save")}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { button, isEditing: showInput, panel };
};
