import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import React, { useMemo, useCallback } from "react";
import { useTheme } from "#/shared/hooks/use-theme";

interface VideoContentProps {
  src?: string;
  previewSrc: string | null;
  placeholder?: { id: string; name: string; progress?: number } | null;
  alt?: string;
  t: (dark: string, light: string) => string;
}

const VideoContent = React.memo(
  ({ src, previewSrc, placeholder, alt, t }: VideoContentProps) => {
    if (src) {
      return (
        /* eslint-disable-next-line jsx-a11y/media-has-caption */
        <video
          aria-label={alt || "uploaded video"}
          className="w-full h-full object-contain rounded-none block transition-transform duration-300"
          src={src}
          controls
          preload="metadata"
        />
      );
    }

    if (previewSrc) {
      const progress = placeholder?.progress ?? 0;
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            aria-label={placeholder?.name || "preview"}
            className="w-full h-full object-contain opacity-50 blur-[1px] rounded-none block"
            src={previewSrc}
            controls
            preload="metadata"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] transition-opacity duration-300">
            <div className="relative w-12 h-12 flex items-center justify-center">
              {/* Circular progress track */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="3"
                  fill="transparent"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  stroke="#b58cff"
                  strokeWidth="3"
                  fill="transparent"
                  strokeDasharray={125.6}
                  strokeDashoffset={125.6 - (125.6 * progress) / 100}
                  className="transition-all duration-200 ease-out"
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-white">{progress}%</span>
            </div>
            <span className="text-[10px] lowercase tracking-wide font-medium text-white max-w-[200px] truncate">
              uploading {placeholder?.name}
            </span>
          </div>
        </div>
      );
    }

    if (placeholder) {
      const progress = placeholder?.progress ?? 0;
      return (
        <div
          className={`w-full py-8 flex flex-col items-center justify-center gap-3 border border-dashed rounded-none ${t("border-neutral-800 bg-neutral-900/5 text-neutral-400", "border-neutral-200 bg-neutral-50 text-neutral-500")}`}
        >
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke={t("rgba(255, 255, 255, 0.1)", "rgba(0, 0, 0, 0.05)")}
                strokeWidth="3"
                fill="transparent"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="#b58cff"
                strokeWidth="3"
                fill="transparent"
                strokeDasharray={125.6}
                strokeDashoffset={125.6 - (125.6 * progress) / 100}
                className="transition-all duration-200 ease-out"
              />
            </svg>
            <span
              className={`absolute text-[10px] font-bold ${t("text-white", "text-neutral-700")}`}
            >
              {progress}%
            </span>
          </div>
          <span className="text-[10px] lowercase tracking-wide font-medium">
            uploading {placeholder.name}
          </span>
        </div>
      );
    }

    return null;
  },
  (prev, next) =>
    prev.src === next.src &&
    prev.previewSrc === next.previewSrc &&
    prev.placeholder?.id === next.placeholder?.id &&
    prev.placeholder?.progress === next.placeholder?.progress &&
    prev.alt === next.alt,
);

export const VideoView = (props: NodeViewProps) => {
  const { node, editor } = props;
  const { src, width, height, aspectRatio, placeholder, alt, align } = node.attrs;
  const { isDarkMode } = useTheme();

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const previewSrc = useMemo(() => {
    const storage = editor?.storage as unknown as
      | Record<string, Record<string, Record<string, string | undefined>>>
      | undefined;
    if (placeholder?.id && storage?.shared?.videoPreviews) {
      return storage.shared.videoPreviews[placeholder.id] || null;
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
    (direction: "left" | "right", startWidth: number, startX: number) => {
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        let newWidth = startWidth + (direction === "right" ? deltaX : -deltaX);

        if (newWidth < 100) {
          newWidth = 100;
        }

        const newHeight = aspectRatio ? newWidth / aspectRatio : newWidth / 1.777;

        editor.commands.updateAttributes("video", {
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
    (e: React.MouseEvent, direction: "left" | "right") => {
      e.preventDefault();
      const startX = e.clientX;

      const videoWrapper = e.currentTarget.parentElement;
      if (!videoWrapper) {
        return;
      }
      const startWidth = videoWrapper.clientWidth;

      handleResize(direction, startWidth, startX);
    },
    [handleResize],
  );

  // Show handles only on hover
  const handleOpacityClass = "opacity-0 group-hover:opacity-100 transition-opacity duration-200";
  const showHandles = editor?.isEditable && src;

  const resolvedAspectRatio = useMemo(() => {
    if (aspectRatio) {
      return `${aspectRatio}`;
    }
    return src ? undefined : "16/9";
  }, [aspectRatio, src]);

  return (
    <NodeViewWrapper className={alignmentClass} data-drag-handle>
      <div
        contentEditable={false}
        className={`relative max-w-full overflow-visible group rounded-none ${
          src ? "" : t("bg-neutral-900/10", "bg-neutral-100/50")
        }`}
        style={{
          aspectRatio: resolvedAspectRatio,
          height: resolvedAspectRatio ? "auto" : displayHeight,
          width: displayWidth,
        }}
      >
        <VideoContent alt={alt} placeholder={placeholder} previewSrc={previewSrc} src={src} t={t} />

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

export default VideoView;
