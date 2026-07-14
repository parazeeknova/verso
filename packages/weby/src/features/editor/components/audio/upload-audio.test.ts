/* eslint-disable promise/prefer-await-to-callbacks */
import type { Mock } from "vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { uploadAudio } from "./upload-audio";
import { setFlashToast } from "#/features/console/components/flash-toast";
import type { Editor } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";

// Mock setFlashToast
vi.mock("#/features/console/components/flash-toast", () => ({
  setFlashToast: vi.fn(),
}));

describe("uploadAudio", () => {
  let mockEditor: Editor;
  let mockFile: File;

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock URL functions
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-blob");
    globalThis.URL.revokeObjectURL = vi.fn();

    // Mock Editor Tiptap
    const rawMockEditor = {
      state: {
        doc: {
          descendants: vi.fn(),
        },
        schema: {
          nodes: {
            audio: {
              create: vi.fn().mockImplementation((attrs) => ({
                attrs,
                type: { name: "audio" },
              })),
            },
          },
        },
        selection: {
          from: 10,
        },
        tr: {
          delete: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          setNodeMarkup: vi.fn().mockReturnThis(),
        },
      },
      storage: {
        shared: {
          pageId: "my-test-page-id",
          pageName: "my-test-page",
          spaceName: "my-test-space",
        },
      },
      view: {
        dispatch: vi.fn(),
      },
    };

    mockEditor = rawMockEditor as unknown as Editor;
    mockFile = new File(["mock content"], "song.mp3", { type: "audio/mpeg" });
  });

  it("should reject non-audio files", async () => {
    const invalidFile = new File(["mock text"], "doc.txt", { type: "text/plain" });
    await uploadAudio(invalidFile, mockEditor, 5);
    expect(setFlashToast).toHaveBeenCalledWith("only audio files are allowed");
  });

  it("should reject files over the 20MB size limit", async () => {
    const hugeFile = {
      name: "huge.mp3",
      size: 21 * 1024 * 1024,
      type: "audio/mpeg",
    } as unknown as File;
    await uploadAudio(hugeFile, mockEditor, 5);
    expect(setFlashToast).toHaveBeenCalledWith("file exceeds the 20mb limit");
  });

  it("should successfully upload audio and update editor state on fetch 200", async () => {
    // Stub global fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ src: "/api/console/files/my-test-space-my-test-page/unique.mp3" }),
      ok: true,
      status: 200,
    } as unknown as Response) as unknown as typeof fetch;

    const storage = mockEditor.storage as unknown as {
      shared: {
        pageId?: string;
        spaceName?: string;
        pageName?: string;
        audioPreviews?: Record<string, string | undefined>;
      };
    };

    // Mock find placeholder logic dynamically
    const descendantsMock = mockEditor.state.doc.descendants as unknown as Mock;
    descendantsMock.mockImplementation(
      (callback: (node: ProsemirrorNode, pos: number) => boolean) => {
        const generatedId = Object.keys(storage.shared.audioPreviews || {})[0] || "mock-id";
        callback(
          {
            attrs: { placeholder: { id: generatedId, name: "song.mp3" } },
            type: { name: "audio" },
          } as unknown as ProsemirrorNode,
          15,
        );
      },
    );

    await uploadAudio(mockFile, mockEditor, 5);

    // Should create optimistic preview
    expect(storage.shared.audioPreviews).toBeDefined();
    expect(mockEditor.state.schema.nodes.audio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        placeholder: expect.objectContaining({ name: "song.mp3" }),
      }),
    );

    // Expect initial insertion dispatch
    expect(mockEditor.view.dispatch).toHaveBeenCalled();

    // Verify S3/local fetch request payload
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/console/upload",
      expect.objectContaining({
        body: expect.any(FormData),
        method: "POST",
      }),
    );

    // Verify node update on success
    expect(mockEditor.state.tr.setNodeMarkup).toHaveBeenCalledWith(
      15,
      undefined,
      expect.objectContaining({
        placeholder: null,
        src: "/api/console/files/my-test-space-my-test-page/unique.mp3",
      }),
    );

    // Toast
    expect(setFlashToast).toHaveBeenCalledWith("audio uploaded successfully");
  });

  it("should clean up and remove placeholder on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response) as unknown as typeof fetch;

    const storage = mockEditor.storage as unknown as {
      shared: {
        pageId?: string;
        spaceName?: string;
        pageName?: string;
        audioPreviews?: Record<string, string | undefined>;
      };
    };

    const descendantsMock = mockEditor.state.doc.descendants as unknown as Mock;
    descendantsMock.mockImplementation(
      (callback: (node: ProsemirrorNode, pos: number) => boolean) => {
        const generatedId = Object.keys(storage.shared.audioPreviews || {})[0] || "mock-id";
        callback(
          {
            attrs: { placeholder: { id: generatedId, name: "song.mp3" } },
            type: { name: "audio" },
          } as unknown as ProsemirrorNode,
          15,
        );
      },
    );

    await uploadAudio(mockFile, mockEditor, 5);

    // Verify delete placeholder transaction
    expect(mockEditor.state.tr.delete).toHaveBeenCalledWith(15, 16);
    expect(setFlashToast).toHaveBeenCalledWith(expect.stringContaining("failed to upload audio"));
  });
});
