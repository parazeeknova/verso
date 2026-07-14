import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useMemo } from "react";
import { useTheme } from "#/shared/hooks/use-theme";

interface AudioContentProps {
  src?: string;
  previewSrc: string | null;
  placeholder?: { id: string; name: string } | null;
  t: (dark: string, light: string) => string;
}

const AudioContent = ({ src, previewSrc, placeholder, t }: AudioContentProps) => {
  if (src) {
    return (
      /* eslint-disable-next-line jsx-a11y/media-has-caption */
      <audio
        aria-label={placeholder?.name || "uploaded audio"}
        className="w-full block"
        src={src}
        controls
        preload="metadata"
      />
    );
  }

  if (previewSrc) {
    return (
      <div className="relative w-full flex items-center justify-center">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          aria-label={placeholder?.name || "preview"}
          className="w-full opacity-60 blur-[1px] block"
          src={previewSrc}
          controls
          preload="metadata"
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
        className={`w-full py-4 flex flex-col items-center justify-center gap-2 border border-dashed rounded-none ${t("border-neutral-800 bg-neutral-900/5 text-neutral-400", "border-neutral-200 bg-neutral-50 text-neutral-500")}`}
      >
        <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent dark:border-neutral-500 dark:border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] lowercase">uploading {placeholder.name}...</span>
      </div>
    );
  }

  return null;
};

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
