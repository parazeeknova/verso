import type { Editor } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { setFlashToast } from "#/features/console/components/flash-toast";
import { logger } from "#/shared/lib/logger";

const getVideoDimensions = (file: File): Promise<{ width: number; height: number }> =>
  // eslint-disable-next-line promise/avoid-new
  new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.addEventListener("loadedmetadata", () => {
      resolve({ height: video.videoHeight, width: video.videoWidth });
      URL.revokeObjectURL(url);
    });
    video.addEventListener("error", () => {
      resolve({ height: 0, width: 0 });
      URL.revokeObjectURL(url);
    });
    video.src = url;
  });

const findVideoNodeByPlaceholderId = (
  doc: ProsemirrorNode,
  placeholderId: string,
): { node: ProsemirrorNode; pos: number } | null => {
  let result: { node: ProsemirrorNode; pos: number } | null = null;
  doc.descendants((node: ProsemirrorNode, pos: number) => {
    if (result) {
      return false;
    }
    if (node.type.name === "video" && node.attrs.placeholder?.id === placeholderId) {
      result = { node, pos };
      return false;
    }
    return true;
  });
  return result;
};

export const uploadVideo = async (file: File, editor: Editor, pos: number) => {
  if (!file.type.startsWith("video/")) {
    setFlashToast("only video files are allowed");
    return;
  }

  // Check upload size limit (e.g. 50MB)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    setFlashToast("file exceeds the 50mb limit");
    return;
  }

  const placeholderId = Math.random().toString(36).slice(2, 9);
  const objectUrl = URL.createObjectURL(file);

  logger.info(
    { fileName: file.name, fileSize: file.size, placeholderId },
    "starting optimistic video upload",
  );

  // Store preview object URL in editor storage
  const storage = editor.storage as unknown as {
    shared: {
      pageId?: string;
      spaceName?: string;
      pageName?: string;
      videoPreviews?: Record<string, string | undefined>;
    };
  };
  storage.shared = storage.shared || {};
  storage.shared.videoPreviews = storage.shared.videoPreviews || {};
  storage.shared.videoPreviews[placeholderId] = objectUrl;

  // Retrieve dimensions
  const dimensions = await getVideoDimensions(file);
  const width = dimensions.width || undefined;
  const height = dimensions.height || undefined;
  const aspectRatio =
    dimensions.width && dimensions.height ? dimensions.width / dimensions.height : undefined;

  // Insert placeholder video block optimistically
  editor.view.dispatch(
    editor.state.tr.insert(
      pos,
      editor.state.schema.nodes.video.create({
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

  try {
    const res = await fetch("/api/console/upload", {
      body: formData,
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    logger.info({ placeholderId, src: data.src }, "optimistic video upload succeeded");

    // Replace placeholder with final served video URL
    const { state } = editor;
    const placeholderNode = findVideoNodeByPlaceholderId(state.doc, placeholderId);
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

    setFlashToast("video uploaded successfully");
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, placeholderId }, "video upload failed");

    // Remove placeholder on failure
    const { state } = editor;
    const placeholderNode = findVideoNodeByPlaceholderId(state.doc, placeholderId);
    if (placeholderNode) {
      editor.view.dispatch(state.tr.delete(placeholderNode.pos, placeholderNode.pos + 1));
    }

    setFlashToast(`failed to upload video: ${errMsg}`);
  } finally {
    // Revoke preview URL and clean storage
    URL.revokeObjectURL(objectUrl);
    if (storage.shared.videoPreviews) {
      storage.shared.videoPreviews[placeholderId] = undefined;
    }
  }
};

export default uploadVideo;
