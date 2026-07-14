import type { Editor } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { setFlashToast } from "#/features/console/components/flash-toast";
import { logger } from "#/shared/lib/logger";

const MAX_SIZE = 100 * 1024 * 1024;

interface UploadResponse {
  id?: string;
  src: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
  mime?: string;
}

const findAttachmentNodeByPlaceholderId = (
  doc: ProsemirrorNode,
  placeholderId: string,
): { node: ProsemirrorNode; pos: number } | null => {
  let result: { node: ProsemirrorNode; pos: number } | null = null;
  doc.descendants((node: ProsemirrorNode, pos: number) => {
    if (result) {
      return false;
    }
    if (node.type.name === "attachment" && node.attrs.placeholder?.id === placeholderId) {
      result = { node, pos };
      return false;
    }
    return true;
  });
  return result;
};

export const uploadAttachment = async (file: File, editor: Editor, pos: number) => {
  if (file.size > MAX_SIZE) {
    setFlashToast("file exceeds the 100mb limit");
    return;
  }

  const placeholderId = Math.random().toString(36).slice(2, 9);

  logger.info(
    { fileName: file.name, fileSize: file.size, placeholderId },
    "starting optimistic attachment upload",
  );

  const storage = editor.storage as unknown as {
    shared: {
      pageId?: string;
      spaceName?: string;
      pageName?: string;
    };
  };
  storage.shared = storage.shared || {};

  // Insert placeholder attachment block optimistically
  editor.view.dispatch(
    editor.state.tr.insert(
      pos,
      editor.state.schema.nodes.attachment.create({
        mime: file.type,
        name: file.name,
        placeholder: { id: placeholderId, name: file.name },
        size: file.size,
      }),
    ),
  );

  const spaceName = storage.shared.spaceName || "default";
  const pageName = storage.shared.pageName || "default";
  const pageId = storage.shared.pageId || "";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("spaceName", spaceName);
  formData.append("pageName", pageName);
  if (pageId) {
    formData.append("pageId", pageId);
  }

  try {
    const res = await fetch("/api/console/upload", {
      body: formData,
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as UploadResponse;
    logger.info(
      { attachmentId: data.id, placeholderId, src: data.src },
      "optimistic attachment upload succeeded",
    );

    const { state } = editor;
    const placeholderNode = findAttachmentNodeByPlaceholderId(state.doc, placeholderId);
    if (placeholderNode) {
      editor.view.dispatch(
        state.tr.setNodeMarkup(placeholderNode.pos, undefined, {
          attachmentId: data.id,
          mime: file.type,
          name: data.fileName || file.name,
          placeholder: null,
          size: data.fileSize ?? file.size,
          url: data.src,
        }),
      );
    }

    setFlashToast("file uploaded successfully");
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, placeholderId }, "attachment upload failed");

    const { state } = editor;
    const placeholderNode = findAttachmentNodeByPlaceholderId(state.doc, placeholderId);
    if (placeholderNode) {
      editor.view.dispatch(state.tr.delete(placeholderNode.pos, placeholderNode.pos + 1));
    }

    setFlashToast(`failed to upload file: ${errMsg}`);
  }
};

export default uploadAttachment;
