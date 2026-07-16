import "katex/dist/katex.min.css";
import { Popover, Textarea } from "@mantine/core";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { render } from "katex";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "#/shared/hooks/use-theme";
import classes from "./math.module.css";

export const InlineMathView = (props: NodeViewProps) => {
  const { node, updateAttributes, editor, selected, getPos } = props;
  const mathResultContainer = useRef<HTMLDivElement>(null);
  const mathPreviewContainer = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mathError, setMathError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();

  const renderMath = useCallback((katexString: string, container: HTMLDivElement | null) => {
    if (!container) {
      return;
    }
    try {
      render(katexString, container, { displayMode: false, strict: false });
      setMathError(null);
    } catch (error) {
      setMathError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    renderMath(node.attrs.text ?? "", mathResultContainer.current);
  }, [node.attrs.text, renderMath]);

  useEffect(() => {
    if (isEditing) {
      renderMath(preview ?? "", mathPreviewContainer.current);
    } else if (preview !== null) {
      queueMicrotask(() => {
        updateAttributes({ text: preview.trim() });
      });
    }
  }, [preview, isEditing, renderMath, updateAttributes]);

  useEffect(() => {
    setIsEditing(selected);
    if (selected) {
      setPreview(node.attrs.text ?? "");
    }
  }, [selected, node.attrs.text]);

  const isEmpty = isEditing ? !preview?.trim().length : !node.attrs.text?.trim().length;

  return (
    <Popover
      opened={isEditing && editor.isEditable}
      trapFocus
      position="top"
      shadow="md"
      width={300}
      middlewares={{ flip: true, inline: true, shift: true }}
      withArrow
      arrowSize={8}
      radius="none"
      offset={4}
      zIndex={101}
      styles={{
        arrow: {
          backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
          borderColor: isDarkMode ? "#262626" : "#e5e5e5",
        },
        dropdown: {
          backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
          borderColor: isDarkMode ? "#262626" : "#e5e5e5",
          padding: "4px",
        },
      }}
    >
      <Popover.Target>
        <NodeViewWrapper
          as="span"
          data-katex="true"
          className={[
            classes.mathInline,
            selected ? classes.selected : "",
            mathError ? classes.error : "",
            isEmpty ? classes.empty : "",
          ].join(" ")}
        >
          <div style={{ display: isEditing ? undefined : "none" }} ref={mathPreviewContainer} />
          <div style={{ display: isEditing ? "none" : undefined }} ref={mathResultContainer} />
          {isEmpty && <span className="text-[11px] lowercase">{t("empty equation")}</span>}
          {mathError && <span className="text-[11px] lowercase">{t("invalid equation")}</span>}
        </NodeViewWrapper>
      </Popover.Target>
      <Popover.Dropdown>
        <Textarea
          minRows={1}
          maxRows={5}
          autosize
          ref={textAreaRef}
          radius="none"
          draggable={false}
          value={preview ?? ""}
          placeholder="E = mc^2"
          styles={{
            input: {
              "&:focus": {
                borderColor: "#b58cff",
              },
              backgroundColor: isDarkMode ? "#171717" : "#ffffff",
              border: `1px solid ${isDarkMode ? "#404040" : "#d4d4d4"}`,
              borderRadius: 0,
              color: isDarkMode ? "#f5f5f5" : "#171717",
              fontFamily: "monospace",
              fontSize: "12px",
              padding: "6px 8px",
            },
          }}
          onKeyDown={(e) => {
            e.stopPropagation();

            const pos = getPos?.();
            if (pos === undefined) {
              return;
            }

            if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
              return editor.commands.focus(pos + node.nodeSize);
            }

            if (!textAreaRef.current) {
              return;
            }

            const { selectionStart, selectionEnd } = textAreaRef.current;

            if (e.key === "ArrowLeft" && selectionStart === selectionEnd && selectionStart === 0) {
              editor.commands.focus(pos);
            }

            if (
              e.key === "ArrowRight" &&
              selectionStart === selectionEnd &&
              selectionStart === textAreaRef.current.value.length
            ) {
              editor.commands.focus(pos + node.nodeSize);
            }
          }}
          onChange={(e) => setPreview(e.target.value)}
        />
      </Popover.Dropdown>
    </Popover>
  );
};

export default InlineMathView;
