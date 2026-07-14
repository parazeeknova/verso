/* eslint-disable promise/prefer-await-to-callbacks, @typescript-eslint/no-explicit-any, no-use-before-define, unicorn/prefer-add-event-listener */
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
  mockResponse: { src: "/api/console/files/my-test-space-my-test-page/unique.mp3" },
  shouldSucceed: true,
};

describe("uploadAudio", () => {
  let mockEditor: Editor;
  let mockFile: File;

  beforeEach(() => {
    vi.resetAllMocks();
    mockXHRInstance.shouldSucceed = true;
    mockXHRInstance.mockResponse = {
      src: "/api/console/files/my-test-space-my-test-page/unique.mp3",
    };

    // Mock XMLHttpRequest
    globalThis.XMLHttpRequest = MockXMLHttpRequest as any;

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
    mockXHRInstance.shouldSucceed = false;

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
