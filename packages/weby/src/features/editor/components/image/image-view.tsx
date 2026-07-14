import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import React, { useMemo, useCallback } from "react";
import { useTheme } from "#/shared/hooks/use-theme";

interface ImageContentProps {
  src?: string;
  previewSrc: string | null;
  placeholder?: { id: string; name: string } | null;
  alt?: string;
  t: (dark: string, light: string) => string;
}

const ImageContent = ({ src, previewSrc, placeholder, alt, t }: ImageContentProps) => {
  if (src) {
    return (
      <img
        alt={alt || "uploaded image"}
        className="w-full h-full object-contain rounded-none block transition-transform duration-300"
        src={src}
      />
    );
  }

  if (previewSrc) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          alt={placeholder?.name || "preview"}
          className="w-full h-full object-contain opacity-60 blur-[1px] rounded-none block"
          src={previewSrc}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/10 dark:bg-white/5">
          <div className="w-6 h-6 border-2 border-neutral-400 border-t-transparent dark:border-neutral-600 dark:border-t-transparent rounded-full animate-spin" />
          <span
            className={`text-[10px] lowercase tracking-wide font-medium ${t("text-white", "text-black")}`}
          >
            uploading {placeholder?.name}...
          </span>
        </div>
      </div>
    );
  }

  if (placeholder) {
    return (
      <div
        className={`w-full py-8 flex flex-col items-center justify-center gap-2 border border-dashed rounded-none ${t("border-neutral-800 bg-neutral-900/5 text-neutral-400", "border-neutral-200 bg-neutral-50 text-neutral-500")}`}
      >
        <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent dark:border-neutral-500 dark:border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] lowercase">uploading {placeholder.name}...</span>
      </div>
    );
  }

  return null;
};

export const ImageView = (props: NodeViewProps) => {
  const { node, selected, editor } = props;
  const { src, width, height, aspectRatio, placeholder, alt, align } = node.attrs;
  const { isDarkMode } = useTheme();

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const previewSrc = useMemo(() => {
    const storage = editor?.storage as unknown as
      | Record<string, Record<string, Record<string, string | undefined>>>
      | undefined;
    if (placeholder?.id && storage?.shared?.imagePreviews) {
      return storage.shared.imagePreviews[placeholder.id] || null;
    }
    return null;
  }, [placeholder?.id, editor?.storage]);

  // Support responsive percentage widths or raw pixels
  let displayWidth = "100%";
  if (width) {
    displayWidth = typeof width === "number" ? `${width}px` : width;
  }

  let displayHeight = "auto";
  if (height) {
    displayHeight = typeof height === "number" ? `${height}px` : height;
  }

  // Flex alignment classes on the wrapping block
  const alignmentClass = useMemo(() => {
    if (align === "left") {
      return "w-full flex justify-start my-4";
    }
    if (align === "right") {
      return "w-full flex justify-end my-4";
    }
    return "w-full flex justify-center my-4";
  }, [align]);

  // Mouse / Touch resize handler
  const handleResize = useCallback(
    (
      clientX: number,
      clientY: number,
      startWidth: number,
      startHeight: number,
      startX: number,
      startY: number,
    ) => {
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newWidth = startWidth + deltaX;
        let newHeight = startHeight + deltaY;

        if (newWidth < 50) {
          newWidth = 50;
        }
        if (newHeight < 50) {
          newHeight = 50;
        }

        if (aspectRatio) {
          newHeight = newWidth / aspectRatio;
        }

        editor.commands.updateAttributes("image", {
          height: Math.round(newHeight),
          width: Math.round(newWidth),
        });
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [editor, aspectRatio],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;

      const imgWrapper = e.currentTarget.parentElement;
      if (!imgWrapper) {
        return;
      }
      const startWidth = imgWrapper.clientWidth;
      const startHeight = imgWrapper.clientHeight;

      handleResize(startX, startY, startWidth, startHeight, startX, startY);
    },
    [handleResize],
  );

  return (
    <NodeViewWrapper className={alignmentClass} data-drag-handle>
      <div
        className={`relative max-w-full overflow-hidden transition-all duration-300 ${
          selected ? "ring-2 ring-blue-500 dark:ring-blue-400 rounded-none" : "rounded-none"
        } ${t("bg-neutral-900/10", "bg-neutral-100/50")}`}
        style={{
          aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
          height: displayHeight,
          width: displayWidth,
        }}
      >
        <ImageContent alt={alt} placeholder={placeholder} previewSrc={previewSrc} src={src} t={t} />

        {/* Custom drag resize handle */}
        {selected && src && (
          <button
            className="absolute right-1 bottom-1 w-4 h-4 bg-blue-500 border border-white dark:border-neutral-800 rounded-none cursor-se-resize z-50 hover:scale-125 active:scale-95 shadow-md transition-all flex items-center justify-center"
            onMouseDown={handleResizeStart}
            type="button"
            tabIndex={-1}
            aria-label="Resize image"
          >
            {/* Minimal resize lines inside handle */}
            <svg className="w-2 h-2 text-white" viewBox="0 0 10 10">
              <line
                x1="1"
                y1="9"
                x2="9"
                y2="1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default ImageView;
