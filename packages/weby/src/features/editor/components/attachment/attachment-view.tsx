import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useCallback } from "react";
import { PaperclipIcon, DownloadSimpleIcon, FilePdfIcon, TrashIcon } from "@phosphor-icons/react";
import { useTheme } from "#/shared/hooks/use-theme";

const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null) {
    return "";
  }
  if (bytes === 0) {
    return "0 bytes";
  }
  const k = 1024;
  const sizes = ["bytes", "kb", "mb", "gb"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

export const AttachmentView = (props: NodeViewProps) => {
  const { editor, node, getPos, selected } = props;
  const { url, name, size, mime, attachmentId, placeholder } = node.attrs;
  const { isDarkMode } = useTheme();

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const isPdf = mime === "application/pdf" || name?.toLowerCase().endsWith(".pdf");

  const handleEmbedAsPdf = useCallback(() => {
    const pos = getPos();
    if (pos === undefined || !url) {
      return;
    }

    const { nodeSize } = node;

    editor
      .chain()
      .insertContentAt(
        { from: pos, to: pos + nodeSize },
        {
          attrs: {
            attachmentId,
            name,
            size,
            src: url,
          },
          type: "pdf",
        },
      )
      .run();
  }, [editor, getPos, node, url, name, attachmentId, size]);

  const handleDelete = useCallback(() => {
    const pos = getPos();
    if (pos === undefined) {
      return;
    }
    editor.commands.setNodeSelection(pos);
    editor.commands.deleteSelection();
  }, [editor, getPos]);

  const handleSelect = useCallback(() => {
    const pos = getPos();
    if (pos !== undefined) {
      editor.commands.setNodeSelection(pos);
    }
  }, [editor, getPos]);

  const outlineClass = selected
    ? "outline-[#b58cff]"
    : "outline-neutral-300 dark:outline-neutral-600";
  const textClass = t("text-neutral-200", "text-neutral-800");
  const sizeClass = t("text-neutral-500", "text-neutral-400");
  const actionBtnClass = t(
    "border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white",
    "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-800",
  );

  return (
    <NodeViewWrapper className="w-full my-1" data-drag-handle>
      <div
        contentEditable={false}
        className={`group flex items-center justify-between py-1.5 px-2.5 select-none cursor-pointer outline outline-1 outline-offset-[-1px] ${outlineClass}`}
      >
        <button
          type="button"
          onClick={handleSelect}
          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer bg-transparent border-0 p-0 text-left m-0"
        >
          {!url && placeholder ? (
            <div className="w-4 h-4 border-2 border-[#b58cff] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          ) : (
            <PaperclipIcon size={15} className="text-[#b58cff] flex-shrink-0" />
          )}

          <span className={`text-[11px] truncate font-medium leading-none ${textClass}`}>
            {!url && placeholder ? `uploading ${name}...` : name}
          </span>

          {size !== undefined && size !== null && (
            <span className={`text-[10px] lowercase flex-shrink-0 leading-none ${sizeClass}`}>
              {formatBytes(size)}
            </span>
          )}
        </button>

        {url && (
          <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 ml-2">
            {isPdf && editor.isEditable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmbedAsPdf();
                }}
                className={`p-1 border transition-colors ${actionBtnClass}`}
                title="embed as pdf"
                type="button"
              >
                <FilePdfIcon size={13} />
              </button>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`p-1 border transition-colors ${actionBtnClass}`}
              title="download file"
            >
              <DownloadSimpleIcon size={13} />
            </a>

            {editor.isEditable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className={`p-1 border transition-colors ${t(
                  "border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-red-400 hover:text-red-300",
                  "border-neutral-200 bg-white hover:bg-neutral-50 text-red-500 hover:text-red-600",
                )}`}
                title="delete file"
                type="button"
              >
                <TrashIcon size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default AttachmentView;
