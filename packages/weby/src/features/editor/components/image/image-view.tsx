import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useMemo } from "react";
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
        className="w-full h-auto max-w-full object-contain rounded-md block transition-transform hover:scale-[1.01] duration-300"
        src={src}
      />
    );
  }

  if (previewSrc) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          alt={placeholder?.name || "preview"}
          className="w-full h-auto max-w-full object-contain opacity-60 blur-[1px] rounded-md block"
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
        className={`w-full py-8 flex flex-col items-center justify-center gap-2 border border-dashed rounded-md ${t("border-neutral-800 bg-neutral-900/5 text-neutral-400", "border-neutral-200 bg-neutral-50 text-neutral-500")}`}
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
  const { src, width, height, aspectRatio, placeholder, alt } = node.attrs;
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

  let displayWidth = "100%";
  if (width) {
    displayWidth = typeof width === "number" ? `${width}px` : width;
  }

  let displayHeight = "auto";
  if (height) {
    displayHeight = typeof height === "number" ? `${height}px` : height;
  }

  return (
    <NodeViewWrapper className="my-4 block" data-drag-handle>
      <div
        className={`relative max-w-full overflow-hidden transition-all duration-300 ${
          selected ? "ring-2 ring-neutral-400 dark:ring-neutral-600 rounded-md" : "rounded-md"
        } ${t("bg-neutral-900/10", "bg-neutral-100/50")}`}
        style={{
          aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
          height: displayHeight,
          width: displayWidth,
        }}
      >
        <ImageContent alt={alt} placeholder={placeholder} previewSrc={previewSrc} src={src} t={t} />
      </div>
    </NodeViewWrapper>
  );
};

export default ImageView;
