import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import React, { useCallback, useMemo, useState } from "react";
import { useTheme } from "#/shared/hooks/use-theme";
import { Button, TextInput } from "@mantine/core";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export const parseYoutubeUrl = (url: string): string | null => {
  if (!url) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(hostname)) {
    return null;
  }

  let videoId: string | null = null;
  if (hostname.endsWith(".youtu.be") || hostname === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/").at(0) ?? "";
    videoId = VIDEO_ID_PATTERN.test(id) ? id : null;
  } else if (parsed.pathname.startsWith("/embed/")) {
    const id = parsed.pathname.slice("/embed/".length).split("/").at(0) ?? "";
    videoId = VIDEO_ID_PATTERN.test(id) ? id : null;
  } else if (parsed.pathname.startsWith("/shorts/")) {
    const id = parsed.pathname.slice("/shorts/".length).split("/").at(0) ?? "";
    videoId = VIDEO_ID_PATTERN.test(id) ? id : null;
  } else if (parsed.pathname === "/watch") {
    const id = parsed.searchParams.get("v");
    videoId = id && VIDEO_ID_PATTERN.test(id) ? id : null;
  }

  if (!videoId) {
    return null;
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}`;
};

const YoutubePlaceholder = ({
  onSubmit,
  t,
}: {
  onSubmit: (url: string) => void;
  t: (dark: string, light: string) => string;
}) => {
  const [url, setUrl] = useState("");

  return (
    <div
      className={`w-full flex items-center justify-between gap-2 p-1 border rounded-none ${t(
        "border-neutral-800 bg-neutral-900/5",
        "border-neutral-200 bg-neutral-50",
      )}`}
      style={{ height: "32px" }}
    >
      <TextInput
        placeholder="Paste YouTube link..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1"
        styles={{
          input: {
            "&:focus": {
              borderColor: "transparent",
            },
            backgroundColor: "transparent",
            border: "none",
            borderRadius: 0,
            fontFamily: "monospace",
            fontSize: "12px",
            height: "24px",
            padding: "2px 6px",
          },
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSubmit(url);
          }
        }}
      />
      <Button
        onClick={() => onSubmit(url)}
        radius="none"
        size="xs"
        styles={{
          root: {
            "&:hover": {
              backgroundColor: "#a074ec",
            },
            backgroundColor: "#b58cff",
            borderRadius: 0,
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: "normal",
            height: "24px",
            padding: "0 10px",
          },
        }}
      >
        embed
      </Button>
    </div>
  );
};

export const YoutubeView = (props: NodeViewProps) => {
  const { node, editor, selected, updateAttributes } = props;
  const { src, width, height, align } = node.attrs;
  const { isDarkMode } = useTheme();
  const [isResizing, setIsResizing] = useState(false);
  const [resizingCursor, setResizingCursor] = useState("default");

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const handleSubmit = useCallback(
    (url: string) => {
      const embedUrl = parseYoutubeUrl(url);
      if (embedUrl) {
        updateAttributes({ src: embedUrl });
      }
    },
    [updateAttributes],
  );

  let displayWidth = "100%";
  if (width) {
    displayWidth = typeof width === "number" ? `${width}px` : width;
  }

  let displayHeight = "400px";
  if (height) {
    displayHeight = typeof height === "number" ? `${height}px` : height;
  }

  const alignmentClass = useMemo(() => {
    if (align === "left") {
      return "w-full flex justify-start my-4";
    }
    if (align === "right") {
      return "w-full flex justify-end my-4";
    }
    return "w-full flex justify-center my-4";
  }, [align]);

  const handleResize = useCallback(
    (
      direction: "tl" | "tr" | "bl" | "br" | "bottom",
      startWidth: number,
      startHeight: number,
      startX: number,
      startY: number,
    ) => {
      setIsResizing(true);
      const cursors = {
        bl: "nesw-resize",
        bottom: "ns-resize",
        br: "nwse-resize",
        tl: "nwse-resize",
        tr: "nesw-resize",
      };
      setResizingCursor(cursors[direction]);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;

        if (direction === "bottom") {
          newHeight = Math.max(150, startHeight + deltaY);
          newWidth = newHeight * 1.777;
        } else {
          const signX = direction === "br" || direction === "tr" ? 1 : -1;
          newWidth = Math.max(200, startWidth + deltaX * signX);
          newHeight = newWidth / 1.777;
        }

        updateAttributes({
          height: Math.round(newHeight),
          width: Math.round(newWidth),
        });
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [updateAttributes],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: "tl" | "tr" | "bl" | "br" | "bottom") => {
      e.preventDefault();
      e.stopPropagation();
      const wrapper = e.currentTarget.parentElement;
      if (!wrapper) {
        return;
      }
      handleResize(direction, wrapper.clientWidth, wrapper.clientHeight, e.clientX, e.clientY);
    },
    [handleResize],
  );

  const showHandles = editor?.isEditable && src;
  const handlesVisibleClass =
    isResizing || selected
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100 transition-opacity duration-200";

  const resolvedAspectRatio = src ? "16/9" : undefined;

  return (
    <NodeViewWrapper className={alignmentClass} data-drag-handle>
      <div
        contentEditable={false}
        className={`relative max-w-full overflow-visible group rounded-none ${
          src
            ? `border ${selected ? "border-[#b58cff]" : t("border-neutral-800", "border-neutral-200")}`
            : ""
        }`}
        style={{
          aspectRatio: resolvedAspectRatio,
          height: resolvedAspectRatio ? "auto" : displayHeight,
          width: displayWidth,
        }}
      >
        {src ? (
          <iframe
            title="YouTube video player"
            className="w-full h-full block rounded-none border-none bg-black"
            src={src}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <YoutubePlaceholder onSubmit={handleSubmit} t={t} />
        )}

        {isResizing && (
          <div
            className="absolute inset-0 z-50 bg-transparent"
            style={{ cursor: resizingCursor }}
          />
        )}

        {showHandles && (
          <>
            <button
              aria-label="Resize from top-left corner"
              className={`absolute top-[-3px] left-[-3px] w-4 h-4 cursor-nwse-resize border-t-2 border-l-2 border-[#b58cff] z-50 ${handlesVisibleClass}`}
              onMouseDown={(e) => handleResizeStart(e, "tl")}
              tabIndex={-1}
              type="button"
            />
            <button
              aria-label="Resize from top-right corner"
              className={`absolute top-[-3px] right-[-3px] w-4 h-4 cursor-nesw-resize border-t-2 border-r-2 border-[#b58cff] z-50 ${handlesVisibleClass}`}
              onMouseDown={(e) => handleResizeStart(e, "tr")}
              tabIndex={-1}
              type="button"
            />
            <button
              aria-label="Resize from bottom-left corner"
              className={`absolute bottom-[-3px] left-[-3px] w-4 h-4 cursor-nesw-resize border-b-2 border-l-2 border-[#b58cff] z-50 ${handlesVisibleClass}`}
              onMouseDown={(e) => handleResizeStart(e, "bl")}
              tabIndex={-1}
              type="button"
            />
            <button
              aria-label="Resize from bottom-right corner"
              className={`absolute bottom-[-3px] right-[-3px] w-4 h-4 cursor-nwse-resize border-b-2 border-r-2 border-[#b58cff] z-50 ${handlesVisibleClass}`}
              onMouseDown={(e) => handleResizeStart(e, "br")}
              tabIndex={-1}
              type="button"
            />
            <button
              className={`absolute bottom-[-6px] left-5 right-5 h-3 flex items-center justify-center cursor-ns-resize z-50 ${handlesVisibleClass}`}
              onMouseDown={(e) => handleResizeStart(e, "bottom")}
              type="button"
              tabIndex={-1}
              aria-label="Resize bottom"
            >
              <div className="w-12 h-[3px] bg-[#b58cff] transition-colors rounded-none" />
            </button>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default YoutubeView;
