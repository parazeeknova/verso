import type { Editor } from "@tiptap/core";
import { setFlashToast } from "#/features/console/components/flash-toast";
import { logger } from "#/shared/lib/logger";
import { findNodeByPlaceholderId } from "../common/placeholder";

const MAX_SIZE = 50 * 1024 * 1024;

// 30s ceiling for an in-flight upload; on expiry we abort so the optimistic
// placeholder can be reclaimed instead of staying stuck "uploading".
const UPLOAD_TIMEOUT_MS = 30_000;

interface UploadResponse {
  id?: string;
  src: string;
  url?: string;
  fileName?: string;
  fileSize?: number;
}

export const uploadPdf = async (file: File, editor: Editor, pos: number) => {
  if (file.type !== "application/pdf") {
    setFlashToast("only pdf files are allowed");
    return;
  }

  if (file.size > MAX_SIZE) {
    setFlashToast("file exceeds the 50mb limit");
    return;
  }

  const placeholderId = Math.random().toString(36).slice(2, 9);

  logger.info(
    { fileName: file.name, fileSize: file.size, placeholderId },
    "starting optimistic pdf upload",
  );

  const storage = editor.storage as unknown as {
    shared: {
      pageId?: string;
      spaceName?: string;
      pageName?: string;
    };
  };
  storage.shared = storage.shared || {};

  // Insert placeholder pdf block optimistically
  editor.view.dispatch(
    editor.state.tr.insert(
      pos,
      editor.state.schema.nodes.pdf.create({
        placeholder: { id: placeholderId, name: file.name },
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

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    const res = await fetch("/api/console/upload", {
      body: formData,
      method: "POST",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as UploadResponse;
    logger.info(
      { attachmentId: data.id, placeholderId, src: data.src },
      "optimistic pdf upload succeeded",
    );

    const { state } = editor;
    const placeholderNode = findNodeByPlaceholderId(state.doc, "pdf", placeholderId);
    if (placeholderNode) {
      editor.view.dispatch(
        state.tr.setNodeMarkup(placeholderNode.pos, undefined, {
          attachmentId: data.id,
          name: data.fileName || file.name,
          placeholder: null,
          size: data.fileSize ?? file.size,
          src: data.src,
        }),
      );
    }

    setFlashToast("pdf uploaded successfully");
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, placeholderId }, "pdf upload failed");

    const { state } = editor;
    const placeholderNode = findNodeByPlaceholderId(state.doc, "pdf", placeholderId);
    if (placeholderNode) {
      editor.view.dispatch(state.tr.delete(placeholderNode.pos, placeholderNode.pos + 1));
    }

    setFlashToast(`failed to upload pdf: ${errMsg}`);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export default uploadPdf;
