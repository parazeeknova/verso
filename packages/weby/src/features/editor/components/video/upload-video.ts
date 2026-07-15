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

const updatePlaceholderProgress = (
  editor: Editor,
  placeholderId: string,
  fileName: string,
  percent: number,
) => {
  const { state } = editor;
  const placeholderNode = findVideoNodeByPlaceholderId(state.doc, placeholderId);
  if (placeholderNode) {
    editor.view.dispatch(
      state.tr.setNodeMarkup(placeholderNode.pos, undefined, {
        ...placeholderNode.node.attrs,
        placeholder: {
          id: placeholderId,
          name: fileName,
          progress: percent,
        },
      }),
    );
  }
};

const sendVideoUpload = (
  editor: Editor,
  formData: FormData,
  placeholderId: string,
  fileName: string,
): Promise<{ src: string }> =>
  // eslint-disable-next-line promise/avoid-new
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/console/upload");

    let lastPercent = 0;
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        if (percent !== lastPercent) {
          lastPercent = percent;
          updatePlaceholderProgress(editor, placeholderId, fileName, percent);
        }
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as { src: string });
        } catch {
          reject(new Error("Invalid server response"));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });
    xhr.send(formData);
  });

interface UploadVideoOptions {
  alt?: string;
  align?: string;
}

const buildPreservedAttrs = (options?: UploadVideoOptions) =>
  options?.alt !== undefined || options?.align !== undefined
    ? { align: options?.align, alt: options?.alt }
    : {};

interface VideoDimensions {
  width?: number;
  height?: number;
  aspectRatio?: number;
}

const computeVideoDimensions = (dimensions: {
  width: number;
  height: number;
}): VideoDimensions => ({
  aspectRatio:
    dimensions.width && dimensions.height ? dimensions.width / dimensions.height : undefined,
  height: dimensions.height || undefined,
  width: dimensions.width || undefined,
});

const replacePlaceholderWithVideo = (
  editor: Editor,
  placeholderId: string,
  attrs: Record<string, unknown>,
) => {
  const { state } = editor;
  const placeholderNode = findVideoNodeByPlaceholderId(state.doc, placeholderId);
  if (placeholderNode) {
    editor.view.dispatch(state.tr.setNodeMarkup(placeholderNode.pos, undefined, attrs));
  }
};

const removeVideoPlaceholder = (editor: Editor, placeholderId: string) => {
  const { state } = editor;
  const placeholderNode = findVideoNodeByPlaceholderId(state.doc, placeholderId);
  if (placeholderNode) {
    editor.view.dispatch(state.tr.delete(placeholderNode.pos, placeholderNode.pos + 1));
  }
};

export const uploadVideo = async (
  file: File,
  editor: Editor,
  pos: number,
  options?: UploadVideoOptions,
) => {
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

  // Preserve prior node attributes when replacing an existing video node.
  const preservedAttrs = buildPreservedAttrs(options);

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
  const { width, height, aspectRatio } = computeVideoDimensions(dimensions);

  // Insert placeholder video block optimistically
  editor.view.dispatch(
    editor.state.tr.insert(
      pos,
      editor.state.schema.nodes.video.create({
        ...preservedAttrs,
        aspectRatio,
        height,
        placeholder: { id: placeholderId, name: file.name, progress: 0 },
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
    const data = await sendVideoUpload(editor, formData, placeholderId, file.name);

    logger.info({ placeholderId, src: data.src }, "optimistic video upload succeeded");

    // Replace placeholder with final served video URL
    replacePlaceholderWithVideo(editor, placeholderId, {
      ...preservedAttrs,
      aspectRatio,
      height,
      placeholder: null,
      src: data.src,
      width,
    });

    setFlashToast("video uploaded successfully");
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, placeholderId }, "video upload failed");

    // Remove placeholder on failure
    removeVideoPlaceholder(editor, placeholderId);

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
