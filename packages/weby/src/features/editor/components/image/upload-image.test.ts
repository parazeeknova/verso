/* eslint-disable promise/prefer-await-to-callbacks */
import type { Mock } from "vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { uploadImage } from "./upload-image";
import { setFlashToast } from "#/features/console/components/flash-toast";
import type { Editor } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";

// Mock setFlashToast
vi.mock("#/features/console/components/flash-toast", () => ({
  setFlashToast: vi.fn(),
}));

// Configurable mock Image used across success and failure scenarios. A single
// class is reused (instead of separate success/error classes) so the file keeps
// only one class definition.
let mockImageShouldSucceed = true;
let mockImageNaturalWidth = 800;
let mockImageNaturalHeight = 600;

class MockImage {
  naturalWidth = mockImageNaturalWidth;
  naturalHeight = mockImageNaturalHeight;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private currentSrc = "";
  private readonly listeners: Record<string, (() => void)[]> = {};

  addEventListener(event: string, callback: () => void) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(callback);
  }

  get src() {
    return this.currentSrc;
  }

  set src(value: string) {
    this.currentSrc = value;
    if (mockImageShouldSucceed && this.onload) {
      setTimeout(() => this.onload?.(), 0);
    }
    const eventName = mockImageShouldSucceed ? "load" : "error";
    const eventListeners = this.listeners[eventName];
    if (eventListeners) {
      for (const listener of eventListeners) {
        setTimeout(listener, 0);
      }
    }
  }
}

describe("uploadImage", () => {
  let mockEditor: Editor;
  let mockFile: File;

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock URL functions
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-blob");
    globalThis.URL.revokeObjectURL = vi.fn();

    // Mock Image object to simulate dimensions loading instantly
    mockImageShouldSucceed = true;
    mockImageNaturalWidth = 800;
    mockImageNaturalHeight = 600;
    vi.stubGlobal("Image", MockImage);

    // Mock Editor Tiptap
    const rawMockEditor = {
      state: {
        doc: {
          descendants: vi.fn(),
        },
        schema: {
          nodes: {
            image: {
              create: vi.fn().mockImplementation((attrs) => ({
                attrs,
                type: { name: "image" },
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
    mockFile = new File(["mock content"], "avatar.png", { type: "image/png" });
  });

  it("should reject non-image files", async () => {
    const invalidFile = new File(["mock text"], "doc.txt", { type: "text/plain" });
    await uploadImage(invalidFile, mockEditor, 5);
    expect(setFlashToast).toHaveBeenCalledWith("only image files are allowed");
  });

  it("should reject files over the 10MB size limit", async () => {
    const hugeFile = {
      name: "huge.png",
      size: 11 * 1024 * 1024,
      type: "image/png",
    } as unknown as File;
    await uploadImage(hugeFile, mockEditor, 5);
    expect(setFlashToast).toHaveBeenCalledWith("file exceeds the 10mb limit");
  });

  it("should successfully upload image and update editor state on fetch 200", async () => {
    // Stub global fetch
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({ src: "/api/console/files/my-test-space-my-test-page/unique.png" }),
      ok: true,
      status: 200,
    } as unknown as Response) as unknown as typeof fetch;

    const storage = mockEditor.storage as unknown as {
      shared: {
        pageId?: string;
        spaceName?: string;
        pageName?: string;
        imagePreviews?: Record<string, string | undefined>;
      };
    };

    // Mock find placeholder logic dynamically
    const descendantsMock = mockEditor.state.doc.descendants as unknown as Mock;
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    descendantsMock.mockImplementation(
      (callback: (node: ProsemirrorNode, pos: number) => boolean) => {
        const generatedId = Object.keys(storage.shared.imagePreviews || {})[0] || "mock-id";
        callback(
          {
            attrs: { placeholder: { id: generatedId, name: "avatar.png" } },
            type: { name: "image" },
          } as unknown as ProsemirrorNode,
          15,
        );
      },
    );

    await uploadImage(mockFile, mockEditor, 5);

    // Should create optimistic preview
    expect(storage.shared.imagePreviews).toBeDefined();
    expect(mockEditor.state.schema.nodes.image.create).toHaveBeenCalledWith(
      expect.objectContaining({
        placeholder: expect.objectContaining({ name: "avatar.png" }),
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
        src: "/api/console/files/my-test-space-my-test-page/unique.png",
      }),
    );

    // Toast
    expect(setFlashToast).toHaveBeenCalledWith("image uploaded successfully");
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
        imagePreviews?: Record<string, string | undefined>;
      };
    };

    const descendantsMock = mockEditor.state.doc.descendants as unknown as Mock;
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    descendantsMock.mockImplementation(
      (callback: (node: ProsemirrorNode, pos: number) => boolean) => {
        const generatedId = Object.keys(storage.shared.imagePreviews || {})[0] || "mock-id";
        callback(
          {
            attrs: { placeholder: { id: generatedId, name: "avatar.png" } },
            type: { name: "image" },
          } as unknown as ProsemirrorNode,
          15,
        );
      },
    );

    await uploadImage(mockFile, mockEditor, 5);

    // Verify delete placeholder transaction
    expect(mockEditor.state.tr.delete).toHaveBeenCalledWith(15, 16);
    expect(setFlashToast).toHaveBeenCalledWith(expect.stringContaining("failed to upload image"));
  });

  it("should not fetch and should fail gracefully when image dimensions fail to read", async () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;

    // Image that fails to load, triggering a getImageDimensions rejection
    mockImageShouldSucceed = false;
    mockImageNaturalWidth = 0;
    mockImageNaturalHeight = 0;
    vi.stubGlobal("Image", MockImage);

    const storage = mockEditor.storage as unknown as {
      shared: {
        pageId?: string;
        spaceName?: string;
        pageName?: string;
        imagePreviews?: Record<string, string | undefined>;
      };
    };

    const descendantsMock = mockEditor.state.doc.descendants as unknown as Mock;
    // eslint-disable-next-line promise/prefer-await-to-callbacks
    descendantsMock.mockImplementation(
      (callback: (node: ProsemirrorNode, pos: number) => boolean) => {
        const generatedId = Object.keys(storage.shared.imagePreviews || {})[0] || "mock-id";
        callback(
          {
            attrs: { placeholder: { id: generatedId, name: "avatar.png" } },
            type: { name: "image" },
          } as unknown as ProsemirrorNode,
          15,
        );
      },
    );

    await uploadImage(mockFile, mockEditor, 5);

    // No upload request should be made before dimensions resolve
    expect(globalThis.fetch).not.toHaveBeenCalled();
    // Failure handling should remove the placeholder and surface the error toast
    expect(mockEditor.state.tr.delete).toHaveBeenCalled();
    expect(setFlashToast).toHaveBeenCalledWith(expect.stringContaining("failed to upload image"));
  });
});
