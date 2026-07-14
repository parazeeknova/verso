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

  const borderClass = selected
    ? "border-[#b58cff]"
    : t("border-neutral-800 bg-neutral-900/5", "border-neutral-200 bg-neutral-50");

  const textClass = t("text-neutral-200", "text-neutral-800");
  const sizeClass = t("text-neutral-500", "text-neutral-400");

  return (
    <NodeViewWrapper className="w-full my-3" data-drag-handle>
      <div
        contentEditable={false}
        onClick={handleSelect}
        className={`group flex items-center justify-between border rounded-none p-3 transition-colors duration-200 select-none ${borderClass}`}
        style={{ cursor: "pointer" }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleSelect();
          }
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {!url && placeholder ? (
            <div className="w-5 h-5 border-2 border-[#b58cff] border-t-transparent rounded-full animate-spin flex-shrink-0" />
          ) : (
            <PaperclipIcon size={18} className="text-[#b58cff] flex-shrink-0" />
          )}

          <span className={`text-xs truncate font-medium ${textClass}`}>
            {!url && placeholder ? `uploading ${name}...` : name}
          </span>

          {size !== undefined && size !== null && (
            <span className={`text-[10px] lowercase flex-shrink-0 font-medium ${sizeClass}`}>
              {formatBytes(size)}
            </span>
          )}
        </div>

        {url && (
          <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 group-[.ProseMirror-selectednode]:opacity-100 transition-opacity duration-200 ml-3">
            {isPdf && editor.isEditable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmbedAsPdf();
                }}
                className={`p-1.5 rounded-none border transition-colors ${t(
                  "border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white",
                  "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-800",
                )}`}
                title="embed as pdf"
                type="button"
              >
                <FilePdfIcon size={15} />
              </button>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`p-1.5 rounded-none border transition-colors ${t(
                "border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white",
                "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 hover:text-neutral-800",
              )}`}
              title="download file"
            >
              <DownloadSimpleIcon size={15} />
            </a>

            {editor.isEditable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className={`p-1.5 rounded-none border transition-colors ${t(
                  "border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-red-400 hover:text-red-300",
                  "border-neutral-200 bg-white hover:bg-neutral-50 text-red-500 hover:text-red-600",
                )}`}
                title="delete file"
                type="button"
              >
                <TrashIcon size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default AttachmentView;
