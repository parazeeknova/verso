import type { Mock } from "vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { uploadAttachment } from "./upload-attachment";
import { setFlashToast } from "#/features/console/components/flash-toast";
import type { Editor } from "@tiptap/core";
import type { Node as ProsemirrorNode } from "@tiptap/pm/model";

vi.mock("#/features/console/components/flash-toast", () => ({
  setFlashToast: vi.fn(),
}));

vi.mock("#/shared/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const makeFile = (name = "readme.zip", size = 2048, type = "application/zip") =>
  ({
    name,
    size,
    type,
  }) as unknown as File;

describe("uploadAttachment", () => {
  let mockEditor: Editor;
  let createdPlaceholderId: string | undefined;

  beforeEach(() => {
    vi.resetAllMocks();
    createdPlaceholderId = undefined;

    const rawMockEditor = {
      commands: {
        deleteSelection: vi.fn(),
      },
      state: {
        doc: {
          descendants: vi.fn(),
        },
        schema: {
          nodes: {
            attachment: {
              create: vi.fn().mockImplementation((attrs) => {
                createdPlaceholderId = attrs?.placeholder?.id;
                return {
                  attrs,
                  type: { name: "attachment" },
                };
              }),
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
  });

  it("should reject files over the 100MB size limit", async () => {
    const hugeFile = makeFile("huge.zip", 101 * 1024 * 1024);
    await uploadAttachment(hugeFile, mockEditor, 5);
    expect(setFlashToast).toHaveBeenCalledWith("file exceeds the 100mb limit");
    expect(mockEditor.view.dispatch).not.toHaveBeenCalled();
  });

  it("should accept files of any type", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          fileName: "notes.txt",
          fileSize: 512,
          id: "attach-txt",
          src: "/api/console/files/my-test-space-my-test-page/notes.txt",
        }),
      ok: true,
      status: 200,
    } as unknown as Response) as unknown as typeof fetch;

    const descendantsMock = mockEditor.state.doc.descendants as unknown as Mock;
    descendantsMock.mockImplementation(
      // eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
      (callback: (node: ProsemirrorNode, pos: number) => boolean) => {
        // eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
        callback(
          {
            attrs: { placeholder: { id: createdPlaceholderId, name: "notes.txt" } },
            type: { name: "attachment" },
          } as unknown as ProsemirrorNode,
          15,
        );
      },
    );

    const txtFile = makeFile("notes.txt", 512, "text/plain");
    await uploadAttachment(txtFile, mockEditor, 5);

    expect(mockEditor.view.dispatch).toHaveBeenCalled();
    expect(setFlashToast).toHaveBeenCalledWith("file uploaded successfully");
  });

  it("should successfully upload attachment and update editor state on fetch 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          fileName: "readme.zip",
          fileSize: 2048,
          id: "attach-123",
          src: "/api/console/files/my-test-space-my-test-page/unique.zip",
        }),
      ok: true,
      status: 200,
    } as unknown as Response) as unknown as typeof fetch;

    const descendantsMock = mockEditor.state.doc.descendants as unknown as Mock;
    descendantsMock.mockImplementation(
      // eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
      (callback: (node: ProsemirrorNode, pos: number) => boolean) => {
        // eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
        callback(
          {
            attrs: { placeholder: { id: createdPlaceholderId, name: "readme.zip" } },
            type: { name: "attachment" },
          } as unknown as ProsemirrorNode,
          15,
        );
      },
    );

    await uploadAttachment(makeFile(), mockEditor, 5);

    // Optimistic placeholder creation
    expect(mockEditor.state.schema.nodes.attachment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        placeholder: expect.objectContaining({ name: "readme.zip" }),
      }),
    );
    expect(mockEditor.view.dispatch).toHaveBeenCalled();

    // Upload request payload
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/console/upload",
      expect.objectContaining({
        body: expect.any(FormData),
        method: "POST",
      }),
    );

    // Node update on success
    expect(mockEditor.state.tr.setNodeMarkup).toHaveBeenCalledWith(
      15,
      undefined,
      expect.objectContaining({
        attachmentId: "attach-123",
        placeholder: null,
        url: "/api/console/files/my-test-space-my-test-page/unique.zip",
      }),
    );

    expect(setFlashToast).toHaveBeenCalledWith("file uploaded successfully");
  });

  it("should clean up and remove placeholder on fetch failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response) as unknown as typeof fetch;

    const descendantsMock = mockEditor.state.doc.descendants as unknown as Mock;
    descendantsMock.mockImplementation(
      // eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
      (callback: (node: ProsemirrorNode, pos: number) => boolean) => {
        // eslint-disable-next-line eslint-plugin-promise/prefer-await-to-callbacks
        callback(
          {
            attrs: { placeholder: { id: createdPlaceholderId, name: "readme.zip" } },
            type: { name: "attachment" },
          } as unknown as ProsemirrorNode,
          15,
        );
      },
    );

    await uploadAttachment(makeFile(), mockEditor, 5);

    expect(mockEditor.state.tr.delete).toHaveBeenCalledWith(15, 16);
    expect(setFlashToast).toHaveBeenCalledWith(expect.stringContaining("failed to upload file"));
  });
});
