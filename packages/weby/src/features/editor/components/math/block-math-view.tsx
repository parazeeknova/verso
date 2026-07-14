import "katex/dist/katex.min.css";
import { render } from "katex";
import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { ActionIcon, Flex, Popover, Stack, Textarea } from "@mantine/core";
import { IconTrashX } from "@tabler/icons-react";
import { useDebouncedValue } from "@mantine/hooks";
import classes from "./math.module.css";

export const BlockMathView = (props: NodeViewProps) => {
  const { node, updateAttributes, editor, selected, getPos } = props;
  const mathResultContainer = useRef<HTMLDivElement>(null);
  const mathPreviewContainer = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mathError, setMathError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [debouncedPreview] = useDebouncedValue(preview, 500);

  const renderMath = (katexString: string, container: HTMLDivElement | null) => {
    if (!container) {
      return;
    }
    try {
      render(katexString, container, { displayMode: true, strict: false });
      setMathError(null);
    } catch (error) {
      setMathError(error instanceof Error ? error.message : String(error));
    }
  };

  useEffect(() => {
    renderMath(node.attrs.text ?? "", mathResultContainer.current);
  }, [node.attrs.text]);

  useEffect(() => {
    if (isEditing) {
      renderMath(preview ?? "", mathPreviewContainer.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, isEditing]);

  useEffect(() => {
    if (debouncedPreview !== null) {
      queueMicrotask(() => {
        updateAttributes({ text: debouncedPreview });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPreview]);

  useEffect(() => {
    const pos = getPos();
    const { from, to } = editor.state.selection;
    const nodeSelected = selected && from === pos && to === pos + node.nodeSize;
    setIsEditing(nodeSelected);
    if (nodeSelected) {
      setPreview(node.attrs.text ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const isEmpty = isEditing ? !preview?.trim().length : !node.attrs.text?.trim().length;

  return (
    <Popover
      opened={isEditing && editor.isEditable}
      trapFocus
      position="top"
      shadow="md"
      width={500}
      withArrow
      zIndex={101}
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
            style={{ display: isEditing && preview?.length ? undefined : "none" }}
            ref={mathPreviewContainer}
          />
          <div style={{ display: isEditing ? "none" : undefined }} ref={mathResultContainer} />
          {isEmpty && <div className="text-[11px] lowercase">empty equation</div>}
          {mathError && <div className="text-[11px] lowercase">invalid equation</div>}
        </NodeViewWrapper>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack>
          <Textarea
            minRows={4}
            maxRows={8}
            autosize
            ref={textAreaRef}
            radius="none"
            draggable={false}
            classNames={{ input: classes.textInput }}
            value={preview ?? ""}
            placeholder="E = mc^2"
            onBlur={(e) => {
              e.preventDefault();
            }}
            onKeyDown={(e) => {
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
            }}
            onChange={(e) => setPreview(e.target.value)}
          />

          <Flex justify="flex-end" align="flex-end">
            <ActionIcon
              variant="light"
              color="red"
              aria-label="Delete equation"
              onClick={() => props.deleteNode()}
            >
              <IconTrashX size={18} />
            </ActionIcon>
          </Flex>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
