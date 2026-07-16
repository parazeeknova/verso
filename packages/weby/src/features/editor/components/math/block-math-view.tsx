import "katex/dist/katex.min.css";
import { render } from "katex";
import { useEffect, useRef, useState, useCallback } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { ActionIcon, Flex, Popover, Stack, Textarea } from "@mantine/core";
import { TrashIcon } from "@phosphor-icons/react";
import { useDebouncedValue } from "@mantine/hooks";
import { useTheme } from "#/shared/hooks/use-theme";
import classes from "./math.module.css";

const renderKatex = (katexString: string, container: HTMLDivElement | null): string | null => {
  if (!container) {
    return null;
  }
  try {
    render(katexString, container, { displayMode: true, strict: false });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

const useMathEditingState = (node: NodeViewProps["node"], selected: NodeViewProps["selected"]) => {
  const [isEditing, setIsEditing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    setIsEditing(selected);
    if (selected) {
      setPreview(node.attrs.text ?? "");
    }
  }, [selected, node.attrs.text]);

  return { isEditing, preview, setPreview };
};

const useDebouncedAttributesUpdate = (
  debouncedPreview: string | null,
  updateAttributes: NodeViewProps["updateAttributes"],
) => {
  useEffect(() => {
    if (debouncedPreview !== null) {
      queueMicrotask(() => {
        updateAttributes({ text: debouncedPreview });
      });
    }
  }, [debouncedPreview, updateAttributes]);
};

// eslint-disable-next-line complexity
export const BlockMathView = (props: NodeViewProps) => {
  const { node, updateAttributes, editor, selected, getPos } = props;
  const mathResultContainer = useRef<HTMLDivElement>(null);
  const mathPreviewContainer = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mathError, setMathError] = useState<string | null>(null);
  const { isDarkMode } = useTheme();

  const { isEditing, preview, setPreview } = useMathEditingState(node, selected);

  const [debouncedPreview] = useDebouncedValue(preview, 500);
  useDebouncedAttributesUpdate(debouncedPreview, updateAttributes);

  const renderMath = useCallback((katexString: string, container: HTMLDivElement | null) => {
    const error = renderKatex(katexString, container);
    setMathError(error);
  }, []);

  useEffect(() => {
    renderMath(node.attrs.text ?? "", mathResultContainer.current);
  }, [node.attrs.text, renderMath]);

  useEffect(() => {
    if (isEditing) {
      renderMath(preview ?? "", mathPreviewContainer.current);
    }
  }, [preview, isEditing, renderMath]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

      if (
        (e.key === "ArrowLeft" || e.key === "ArrowUp") &&
        selectionStart === selectionEnd &&
        selectionStart === 0
      ) {
        editor.commands.focus(pos - 1);
      }

      if (
        (e.key === "ArrowRight" || e.key === "ArrowDown") &&
        selectionStart === selectionEnd &&
        selectionStart === textAreaRef.current.value.length
      ) {
        editor.commands.focus(pos + node.nodeSize);
      }
    },
    [getPos, editor.commands, node.nodeSize],
  );

  const isEmpty = isEditing ? !preview?.trim().length : !node.attrs.text?.trim().length;

  return (
    <Popover
      opened={isEditing && editor.isEditable}
      trapFocus
      position="top"
      shadow="md"
      width={400}
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
          padding: "6px",
        },
      }}
    >
      <Popover.Target>
        <NodeViewWrapper
          data-katex="true"
          className={[
            classes.mathBlock,
            selected ? classes.selected : "",
            mathError ? classes.error : "",
            isEmpty ? classes.empty : "",
          ].join(" ")}
        >
          <div
            style={{
              display: isEditing && preview?.length ? undefined : "none",
            }}
            ref={mathPreviewContainer}
          />
          <div style={{ display: isEditing ? "none" : undefined }} ref={mathResultContainer} />
          {isEmpty && <div className="text-[11px] lowercase">empty equation</div>}
          {mathError && <div className="text-[11px] lowercase">invalid equation</div>}
        </NodeViewWrapper>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Textarea
            minRows={3}
            maxRows={8}
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
                width: "100%",
              },
            }}
            onBlur={(e) => {
              e.preventDefault();
            }}
            onKeyDown={handleKeyDown}
            onChange={(e) => setPreview(e.target.value)}
          />

          <Flex justify="flex-end" align="flex-end">
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label="Delete equation"
              onClick={() => props.deleteNode()}
            >
              <TrashIcon size={16} />
            </ActionIcon>
          </Flex>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

export default BlockMathView;
