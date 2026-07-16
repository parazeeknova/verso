import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import React, { useMemo, useCallback } from "react";
import type { SharedEditorStorage } from "../common/storage";

interface ImageContentProps {
  src?: string;
  previewSrc: string | null;
  placeholder?: { id: string; name: string } | null;
  alt?: string;
}

const ImageContent = ({ src, previewSrc, placeholder, alt }: ImageContentProps) => {
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
          <span className="text-[10px] lowercase tracking-wide font-medium text-black dark:text-white">
            uploading {placeholder?.name}...
          </span>
        </div>
      </div>
    );
  }

  if (placeholder) {
    return (
      <div className="w-full py-8 flex flex-col items-center justify-center gap-2 border border-dashed rounded-none border-neutral-200 bg-neutral-50 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900/5 dark:text-neutral-400">
        <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent dark:border-neutral-500 dark:border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] lowercase">uploading {placeholder.name}...</span>
      </div>
    );
  }

  return null;
};

export const ImageView = (props: NodeViewProps) => {
  const { node, editor, updateAttributes } = props;
  const { src, width, height, aspectRatio, placeholder, alt, align } = node.attrs;

  const previewSrc = useMemo(() => {
    const storage = editor?.storage as SharedEditorStorage | undefined;
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
    (direction: "left" | "right", startWidth: number, startHeight: number, startX: number) => {
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        let newWidth = startWidth + (direction === "right" ? deltaX : -deltaX);

        if (newWidth < 50) {
          newWidth = 50;
        }

        let newHeight = startHeight;
        if (aspectRatio) {
          newHeight = newWidth / aspectRatio;
        }

        updateAttributes({
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
    [updateAttributes, aspectRatio],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: "left" | "right") => {
      e.preventDefault();
      const startX = e.clientX;

      const imgWrapper = e.currentTarget.parentElement;
      if (!imgWrapper) {
        return;
      }
      const startWidth = imgWrapper.clientWidth;
      const startHeight = imgWrapper.clientHeight;

      handleResize(direction, startWidth, startHeight, startX);
    },
    [handleResize],
  );

  // Show handles only on hover
  const handleOpacityClass = "opacity-0 group-hover:opacity-100 transition-opacity duration-200";
  const showHandles = editor?.isEditable && src;

  return (
    <NodeViewWrapper className={alignmentClass} data-drag-handle>
      <div
        className={`relative max-w-full overflow-visible group rounded-none ${
          src ? "" : "bg-neutral-100/50 dark:bg-neutral-900/10"
        }`}
        style={{
          aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
          height: displayHeight,
          width: displayWidth,
        }}
      >
        <ImageContent alt={alt} placeholder={placeholder} previewSrc={previewSrc} src={src} />

        {/* Custom Left resize handle */}
        {showHandles && (
          <button
            className={`absolute top-0 bottom-0 left-[-8px] w-4 flex items-center justify-center cursor-ew-resize z-50 group/handle ${handleOpacityClass}`}
            onMouseDown={(e) => handleResizeStart(e, "left")}
            type="button"
            tabIndex={-1}
            aria-label="Resize left"
          >
            <div className="w-[4px] h-12 bg-[#b58cff] transition-colors rounded-none" />
          </button>
        )}

        {/* Custom Right resize handle */}
        {showHandles && (
          <button
            className={`absolute top-0 bottom-0 right-[-8px] w-4 flex items-center justify-center cursor-ew-resize z-50 group/handle ${handleOpacityClass}`}
            onMouseDown={(e) => handleResizeStart(e, "right")}
            type="button"
            tabIndex={-1}
            aria-label="Resize right"
          >
            <div className="w-[4px] h-12 bg-[#b58cff] transition-colors rounded-none" />
          </button>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default ImageView;
