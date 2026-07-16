import type { Editor } from "@tiptap/core";
import { setFlashToast } from "#/features/console/components/flash-toast";
import { logger } from "#/shared/lib/logger";
import { findNodeByPlaceholderId } from "../common/placeholder";

const getImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  // eslint-disable-next-line promise/avoid-new
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.addEventListener("load", () => {
      resolve({ height: img.naturalHeight, width: img.naturalWidth });
      URL.revokeObjectURL(url);
    });
    img.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("failed to read image dimensions"));
    });
    img.src = url;
  });

const UPLOAD_TIMEOUT_MS = 30_000;

export const uploadImage = async (file: File, editor: Editor, pos: number) => {
  if (!file.type.startsWith("image/")) {
    setFlashToast("only image files are allowed");
    return;
  }

  // Check upload size limit (e.g. 10MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    setFlashToast("file exceeds the 10mb limit");
    return;
  }

  const placeholderId = Math.random().toString(36).slice(2, 9);
  const objectUrl = URL.createObjectURL(file);

  logger.info(
    { fileName: file.name, fileSize: file.size, placeholderId },
    "starting optimistic image upload",
  );

  const storage = editor.storage as unknown as {
    shared: {
      pageId?: string;
      spaceName?: string;
      pageName?: string;
      imagePreviews?: Record<string, string | undefined>;
    };
  };
  storage.shared = storage.shared || {};
  storage.shared.imagePreviews = storage.shared.imagePreviews || {};
  storage.shared.imagePreviews[placeholderId] = objectUrl;

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    const { width, height } = await getImageDimensions(file);
    const aspectRatio = width / height;

    // Insert optimistic image block with loading preview
    editor.view.dispatch(
      editor.state.tr.insert(
        pos,
        editor.state.schema.nodes.image.create({
          aspectRatio,
          height,
          placeholder: { id: placeholderId, name: file.name },
          width,
        }),
      ),
    );

    // Retrieve page/space parameters from editor storage
    const spaceName = storage.shared.spaceName || "default";
    const pageName = storage.shared.pageName || "default";
    const pageId = storage.shared.pageId || "";

    // Perform upload request
    const formData = new FormData();
    formData.append("file", file);
    formData.append("spaceName", spaceName);
    formData.append("pageName", pageName);
    if (pageId) {
      formData.append("pageId", pageId);
    }

    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    const res = await fetch("/api/console/upload", {
      body: formData,
      method: "POST",
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    logger.info({ placeholderId, src: data.src }, "optimistic upload succeeded");

    // Replace placeholder with final S3/Local served image URL
    const { state } = editor;
    const placeholderNode = findNodeByPlaceholderId(state.doc, "image", placeholderId);
    if (placeholderNode) {
      editor.view.dispatch(
        state.tr.setNodeMarkup(placeholderNode.pos, undefined, {
          aspectRatio,
          height,
          placeholder: null,
          src: data.src,
          width,
        }),
      );
    }

    setFlashToast("image uploaded successfully");
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, placeholderId }, "image upload failed");

    // Remove placeholder on failure
    const { state } = editor;
    const placeholderNode = findNodeByPlaceholderId(state.doc, "image", placeholderId);
    if (placeholderNode) {
      editor.view.dispatch(state.tr.delete(placeholderNode.pos, placeholderNode.pos + 1));
    }

    setFlashToast(`failed to upload image: ${errMsg}`);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    // Revoke preview URL and clean storage
    URL.revokeObjectURL(objectUrl);
    if (storage.shared.imagePreviews) {
      storage.shared.imagePreviews[placeholderId] = undefined;
    }
  }
};
export default uploadImage;
