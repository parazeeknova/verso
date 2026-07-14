import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import React, { useCallback, useState } from "react";
import { FilePdfIcon } from "@phosphor-icons/react";
import { useTheme } from "#/shared/hooks/use-theme";

interface PdfContentProps {
  src?: string;
  placeholder?: { id: string; name: string } | null;
  name?: string;
  hasError: boolean;
  onError: () => void;
  t: (dark: string, light: string) => string;
}

const PdfPlaceholder = ({
  name,
  t,
}: {
  name?: string;
  t: (dark: string, light: string) => string;
}) => (
  <div
    className={`w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2 border border-dashed rounded-none ${t(
      "border-neutral-800 bg-neutral-900/5 text-neutral-400",
      "border-neutral-200 bg-neutral-50 text-neutral-500",
    )}`}
  >
    <div className="w-5 h-5 border-2 border-[#b58cff] border-t-transparent rounded-full animate-spin" />
    <span className="text-[10px] lowercase">uploading {name}...</span>
  </div>
);

const PdfError = ({ t }: { t: (dark: string, light: string) => string }) => (
  <div
    data-pdf-error
    className={`w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2 border border-dashed rounded-none ${t(
      "border-neutral-800 bg-neutral-900/10 text-neutral-500",
      "border-neutral-300 bg-neutral-50 text-neutral-500",
    )}`}
  >
    <FilePdfIcon size={28} className="text-[#b58cff]" />
    <span className="text-[10px] lowercase">failed to load pdf</span>
  </div>
);

const PdfContent = ({ src, placeholder, name, hasError, onError, t }: PdfContentProps) => {
  if (placeholder && !src) {
    return <PdfPlaceholder name={placeholder.name} t={t} />;
  }

  if (!src) {
    return null;
  }

  if (hasError) {
    return <PdfError t={t} />;
  }

  return (
    <iframe
      title={name || "pdf document"}
      className="w-full h-full block rounded-none border-none bg-white"
      src={src}
      loading="lazy"
      onError={onError}
    />
  );
};

export const PdfView = (props: NodeViewProps) => {
  const { node, editor, selected } = props;
  const { src, width, height, placeholder, name } = node.attrs;
  const { isDarkMode } = useTheme();
  const [hasError, setHasError] = useState(false);

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const handleError = useCallback(() => setHasError(true), []);

  let displayWidth = "100%";
  if (width) {
    displayWidth = typeof width === "number" ? `${width}px` : width;
  }

  let displayHeight = "600px";
  if (height) {
    displayHeight = typeof height === "number" ? `${height}px` : height;
  }

  const handleResize = useCallback(
    (
      direction: "left" | "right" | "bottom",
      startWidth: number,
      startHeight: number,
      startX: number,
      startY: number,
    ) => {
      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (direction === "bottom") {
          const deltaY = moveEvent.clientY - startY;
          const newHeight = Math.max(200, Math.min(1600, startHeight + deltaY));
          editor.commands.updateAttributes("pdf", { height: Math.round(newHeight) });
          return;
        }

        const deltaX = moveEvent.clientX - startX;
        const rawWidth = startWidth + (direction === "right" ? deltaX : -deltaX);
        const newWidth = Math.max(200, Math.min(1200, rawWidth));
        editor.commands.updateAttributes("pdf", { width: Math.round(newWidth) });
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [editor],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: "left" | "right" | "bottom") => {
      e.preventDefault();
      const wrapper = e.currentTarget.parentElement;
      if (!wrapper) {
        return;
      }
      handleResize(direction, wrapper.clientWidth, wrapper.clientHeight, e.clientX, e.clientY);
    },
    [handleResize],
  );

  const handleOpacityClass = "opacity-0 group-hover:opacity-100 transition-opacity duration-200";
  const showHandles = editor?.isEditable && src && !hasError;

  const isLoaded = Boolean(src) && !placeholder;

  return (
    <NodeViewWrapper className="w-full flex justify-center my-4" data-drag-handle>
      <div
        className={`relative max-w-full overflow-visible group rounded-none border ${
          selected ? "border-[#b58cff]" : t("border-neutral-800", "border-neutral-200")
        } ${isLoaded ? "" : t("bg-neutral-900/10", "bg-neutral-100/50")}`}
        style={{
          height: displayHeight,
          width: displayWidth,
        }}
      >
        <PdfContent
          hasError={hasError}
          name={name}
          onError={handleError}
          placeholder={placeholder}
          src={src}
          t={t}
        />

        {showHandles && (
          <button
            className={`absolute top-0 bottom-0 left-[-8px] w-4 flex items-center justify-center cursor-ew-resize z-50 ${handleOpacityClass}`}
            onMouseDown={(e) => handleResizeStart(e, "left")}
            type="button"
            tabIndex={-1}
            aria-label="Resize left"
          >
            <div className="w-[4px] h-12 bg-[#b58cff] transition-colors rounded-none" />
          </button>
        )}

        {showHandles && (
          <button
            className={`absolute top-0 bottom-0 right-[-8px] w-4 flex items-center justify-center cursor-ew-resize z-50 ${handleOpacityClass}`}
            onMouseDown={(e) => handleResizeStart(e, "right")}
            type="button"
            tabIndex={-1}
            aria-label="Resize right"
          >
            <div className="w-[4px] h-12 bg-[#b58cff] transition-colors rounded-none" />
          </button>
        )}

        {showHandles && (
          <button
            className={`absolute left-0 right-0 bottom-[-8px] h-4 flex items-center justify-center cursor-ns-resize z-50 ${handleOpacityClass}`}
            onMouseDown={(e) => handleResizeStart(e, "bottom")}
            type="button"
            tabIndex={-1}
            aria-label="Resize bottom"
          >
            <div className="h-[4px] w-12 bg-[#b58cff] transition-colors rounded-none" />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default PdfView;
