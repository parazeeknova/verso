import type { Editor } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";
import { setFlashToast } from "#/features/console/components/flash-toast";
import { logger } from "#/shared/lib/logger";

const findAudioNodeByPlaceholderId = (
  doc: ProsemirrorNode,
  placeholderId: string,
): { node: ProsemirrorNode; pos: number } | null => {
  let result: { node: ProsemirrorNode; pos: number } | null = null;
  doc.descendants((node: ProsemirrorNode, pos: number) => {
    if (result) {
      return false;
    }
    if (node.type.name === "audio" && node.attrs.placeholder?.id === placeholderId) {
      result = { node, pos };
      return false;
    }
    return true;
  });
  return result;
};

export const uploadAudio = async (file: File, editor: Editor, pos: number) => {
  if (!file.type.startsWith("audio/")) {
    setFlashToast("only audio files are allowed");
    return;
  }

  // Check upload size limit (e.g. 100MB)
  const MAX_SIZE = 100 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    setFlashToast("file exceeds the 100mb limit");
    return;
  }

  const placeholderId = Math.random().toString(36).slice(2, 9);
  const objectUrl = URL.createObjectURL(file);

  logger.info(
    { fileName: file.name, fileSize: file.size, placeholderId },
    "starting optimistic audio upload",
  );

  // Store preview object URL in editor storage
  const storage = editor.storage as unknown as {
    shared: {
      pageId?: string;
      spaceName?: string;
      pageName?: string;
      audioPreviews?: Record<string, string | undefined>;
    };
  };
  storage.shared = storage.shared || {};
  storage.shared.audioPreviews = storage.shared.audioPreviews || {};
  storage.shared.audioPreviews[placeholderId] = objectUrl;

  // Insert placeholder audio block optimistically
  editor.view.dispatch(
    editor.state.tr.insert(
      pos,
      editor.state.schema.nodes.audio.create({
        placeholder: { id: placeholderId, name: file.name, progress: 0 },
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
    // eslint-disable-next-line promise/avoid-new
    const data = await new Promise<{ src: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/console/upload");

      let lastPercent = 0;
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          if (percent !== lastPercent) {
            lastPercent = percent;

            const { state } = editor;
            const placeholderNode = findAudioNodeByPlaceholderId(state.doc, placeholderId);
            if (placeholderNode) {
              editor.view.dispatch(
                state.tr.setNodeMarkup(placeholderNode.pos, undefined, {
                  ...placeholderNode.node.attrs,
                  placeholder: {
                    id: placeholderId,
                    name: file.name,
                    progress: percent,
                  },
                }),
              );
            }
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

      xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
      xhr.send(formData);
    });

    logger.info({ placeholderId, src: data.src }, "optimistic audio upload succeeded");

    // Replace placeholder with final served audio URL
    const { state } = editor;
    const placeholderNode = findAudioNodeByPlaceholderId(state.doc, placeholderId);
    if (placeholderNode) {
      editor.view.dispatch(
        state.tr.setNodeMarkup(placeholderNode.pos, undefined, {
          placeholder: null,
          src: data.src,
        }),
      );
    }

    setFlashToast("audio uploaded successfully");
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, placeholderId }, "audio upload failed");

    // Remove placeholder on failure
    const { state } = editor;
    const placeholderNode = findAudioNodeByPlaceholderId(state.doc, placeholderId);
    if (placeholderNode) {
      editor.view.dispatch(state.tr.delete(placeholderNode.pos, placeholderNode.pos + 1));
    }

    setFlashToast(`failed to upload audio: ${errMsg}`);
  } finally {
    // Revoke preview URL and clean storage
    URL.revokeObjectURL(objectUrl);
    if (storage.shared.audioPreviews) {
      storage.shared.audioPreviews[placeholderId] = undefined;
    }
  }
};

export default uploadAudio;
