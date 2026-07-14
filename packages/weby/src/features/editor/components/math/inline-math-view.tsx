import "katex/dist/katex.min.css";
import { render } from "katex";
import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Popover, Textarea } from "@mantine/core";
import classes from "./math.module.css";

export const InlineMathView = (props: NodeViewProps) => {
  const { node, updateAttributes, editor, selected, getPos } = props;
  const mathResultContainer = useRef<HTMLDivElement>(null);
  const mathPreviewContainer = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mathError, setMathError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const renderMath = (katexString: string, container: HTMLDivElement | null) => {
    if (!container) {
      return;
    }
    try {
      render(katexString, container, { displayMode: false, strict: false });
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
    } else if (preview !== null) {
      queueMicrotask(() => {
        updateAttributes({ text: preview.trim() });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, isEditing]);

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
      width={400}
      middlewares={{ flip: true, inline: true, shift: true }}
      withArrow
      zIndex={101}
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
          {isEmpty && <span className="text-[11px] lowercase">empty equation</span>}
          {mathError && <span className="text-[11px] lowercase">invalid equation</span>}
        </NodeViewWrapper>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <Textarea
          minRows={1}
          maxRows={5}
          autosize
          ref={textAreaRef}
          radius="none"
          draggable={false}
          value={preview ?? ""}
          placeholder="E = mc^2"
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
