import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useMemo, memo } from "react";
import { useTheme } from "#/shared/hooks/use-theme";

interface AudioContentProps {
  src?: string;
  previewSrc: string | null;
  placeholder?: { id: string; name: string; progress?: number } | null;
  t: (dark: string, light: string) => string;
}

const AudioContent = memo(
  ({ src, previewSrc, placeholder, t }: AudioContentProps) => {
    if (src) {
      return (
        /* eslint-disable-next-line jsx-a11y/media-has-caption */
        <audio
          aria-label={placeholder?.name || "uploaded audio"}
          className="w-full block rounded-none"
          src={src}
          controls
          preload="metadata"
        />
      );
    }

    if (previewSrc) {
      const progress = placeholder?.progress ?? 0;
      return (
        <div className="relative w-full flex items-center justify-center">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            aria-label={placeholder?.name || "preview"}
            className="w-full opacity-50 blur-[1px] block rounded-none"
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
          className={`w-full py-4 flex flex-col items-center justify-center gap-3 border border-dashed rounded-none ${t("border-neutral-800 bg-neutral-900/5 text-neutral-400", "border-neutral-200 bg-neutral-50 text-neutral-500")}`}
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
    prev.placeholder?.progress === next.placeholder?.progress,
);

export const AudioView = (props: NodeViewProps) => {
  const { node, editor } = props;
  const { src, placeholder } = node.attrs;
  const { isDarkMode } = useTheme();

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const previewSrc = useMemo(() => {
    const storage = editor?.storage as unknown as
      | Record<string, Record<string, Record<string, string | undefined>>>
      | undefined;
    if (placeholder?.id && storage?.shared?.audioPreviews) {
      return storage.shared.audioPreviews[placeholder.id] || null;
    }
    return null;
  }, [placeholder?.id, editor?.storage]);

  return (
    <NodeViewWrapper className="w-full my-4" data-drag-handle>
      <div
        contentEditable={false}
        className={`max-w-xl mx-auto overflow-hidden group rounded-none border p-2 ${t(
          "bg-neutral-900/10 border-neutral-800",
          "bg-neutral-50 border-neutral-200",
        )}`}
      >
        <AudioContent placeholder={placeholder} previewSrc={previewSrc} src={src} t={t} />
      </div>
    </NodeViewWrapper>
  );
};

export default AudioView;
