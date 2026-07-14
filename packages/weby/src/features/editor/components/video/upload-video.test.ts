/* eslint-disable promise/prefer-await-to-callbacks, @typescript-eslint/no-explicit-any, no-use-before-define, unicorn/prefer-add-event-listener */
import type { Mock } from "vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { uploadVideo } from "./upload-video";
import { setFlashToast } from "#/features/console/components/flash-toast";
import type { Editor } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";

// Mock setFlashToast
vi.mock("#/features/console/components/flash-toast", () => ({
  setFlashToast: vi.fn(),
}));

class MockXMLHttpRequest {
  open = vi.fn();
  send = vi.fn().mockImplementation(function send(this: any) {
    if (mockXHRInstance.shouldSucceed) {
      this.status = 200;
      this.responseText = JSON.stringify(mockXHRInstance.mockResponse);
      if (this.onload) {
        this.onload();
      }
    } else {
      this.status = 500;
      if (this.onerror) {
        this.onerror();
      }
    }
  });
  upload = {
    addEventListener: vi.fn().mockImplementation((event, cb) => {
      // Simulate progress callback immediately
      if (event === "progress") {
        cb({ lengthComputable: true, loaded: 50, total: 100 });
      }
    }),
  };
  status = 0;
  responseText = "";
  addEventListener = vi.fn().mockImplementation(function addEventListener(this: any, event, cb) {
    if (event === "load") {
      this.onload = cb;
    }
    if (event === "error") {
      this.onerror = cb;
    }
  });
  onload: any = null;
  onerror: any = null;
}

const mockXHRInstance = {
  mockResponse: { src: "/api/console/files/my-test-space-my-test-page/unique.mp4" },
  shouldSucceed: true,
};

describe("uploadVideo", () => {
  let mockEditor: Editor;
  let mockFile: File;

  beforeEach(() => {
    vi.resetAllMocks();
    mockXHRInstance.shouldSucceed = true;
    mockXHRInstance.mockResponse = {
      src: "/api/console/files/my-test-space-my-test-page/unique.mp4",
    };

    // Mock XMLHttpRequest
    globalThis.XMLHttpRequest = MockXMLHttpRequest as any;

    // Mock URL functions
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue("blob:http://localhost/mock-blob");
    globalThis.URL.revokeObjectURL = vi.fn();

    // Mock HTMLVideoElement natural dimensions
    const mockVideoEl = {
      addEventListener: vi.fn().mockImplementation((event, cb) => {
        if (event === "loadedmetadata") {
          setTimeout(cb, 0);
        }
      }),
      src: "",
      videoHeight: 720,
      videoWidth: 1280,
    };
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "video") {
        return mockVideoEl as unknown as HTMLElement;
      }
      return document.createElement(tagName);
    });

    // Setup raw mock editor
    const rawMockEditor = {
      chain: vi.fn().mockReturnThis(),
      focus: vi.fn().mockReturnThis(),
      isActive: vi.fn().mockReturnValue(true),
      isEditable: true,
      state: {
        doc: {
          descendants: vi.fn(),
        },
        schema: {
          nodes: {
            video: {
              create: vi.fn().mockImplementation((attrs) => ({
                attrs,
                type: { name: "video" },
              })),
            },
          },
        },
        selection: {
          from: 5,
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
    mockFile = new File(["mock content"], "clip.mp4", { type: "video/mp4" });
  });

  it("should reject non-video files", async () => {
    const invalidFile = new File(["mock text"], "doc.txt", { type: "text/plain" });
    await uploadVideo(invalidFile, mockEditor, 5);
    expect(setFlashToast).toHaveBeenCalledWith("only video files are allowed");
  });

  it("should reject files over the 50MB size limit", async () => {
    const hugeFile = {
      name: "huge.mp4",
      size: 51 * 1024 * 1024,
      type: "video/mp4",
    } as unknown as File;
    await uploadVideo(hugeFile, mockEditor, 5);
    expect(setFlashToast).toHaveBeenCalledWith("file exceeds the 50mb limit");
  });

  it("should successfully upload video and update editor state on fetch 200", async () => {
    const storage = mockEditor.storage as unknown as {
      shared: {
        pageId?: string;
        spaceName?: string;
        pageName?: string;
        videoPreviews?: Record<string, string | undefined>;
      };
    };

    // Mock find placeholder logic dynamically
    const descendantsMock = mockEditor.state.doc.descendants as unknown as Mock;
    descendantsMock.mockImplementation(
      (callback: (node: ProsemirrorNode, pos: number) => boolean) => {
        const generatedId = Object.keys(storage.shared.videoPreviews || {})[0] || "mock-id";
        callback(
          {
            attrs: { placeholder: { id: generatedId, name: "clip.mp4" } },
            type: { name: "video" },
          } as unknown as ProsemirrorNode,
          15,
        );
      },
    );

    await uploadVideo(mockFile, mockEditor, 5);

    // Should create optimistic preview
    expect(storage.shared.videoPreviews).toBeDefined();
    expect(mockEditor.state.schema.nodes.video.create).toHaveBeenCalledWith(
      expect.objectContaining({
        aspectRatio: 1280 / 720,
        height: 720,
        placeholder: expect.objectContaining({ name: "clip.mp4" }),
        width: 1280,
      }),
    );

    // Expect initial insertion dispatch
    expect(mockEditor.view.dispatch).toHaveBeenCalled();

    // Verify node update on success
    expect(mockEditor.state.tr.setNodeMarkup).toHaveBeenCalledWith(
      15,
      undefined,
      expect.objectContaining({
        placeholder: null,
        src: "/api/console/files/my-test-space-my-test-page/unique.mp4",
      }),
    );

    // Toast
    expect(setFlashToast).toHaveBeenCalledWith("video uploaded successfully");
  });

  it("should clean up and remove placeholder on fetch failure", async () => {
    mockXHRInstance.shouldSucceed = false;

    const storage = mockEditor.storage as unknown as {
      shared: {
        pageId?: string;
        spaceName?: string;
        pageName?: string;
        videoPreviews?: Record<string, string | undefined>;
      };
    };

    const descendantsMock = mockEditor.state.doc.descendants as unknown as Mock;
    descendantsMock.mockImplementation(
      (callback: (node: ProsemirrorNode, pos: number) => boolean) => {
        const generatedId = Object.keys(storage.shared.videoPreviews || {})[0] || "mock-id";
        callback(
          {
            attrs: { placeholder: { id: generatedId, name: "clip.mp4" } },
            type: { name: "video" },
          } as unknown as ProsemirrorNode,
          15,
        );
      },
    );

    await uploadVideo(mockFile, mockEditor, 5);

    // Verify delete placeholder transaction
    expect(mockEditor.state.tr.delete).toHaveBeenCalledWith(15, 16);
    expect(setFlashToast).toHaveBeenCalledWith(expect.stringContaining("failed to upload video"));
  });
});
