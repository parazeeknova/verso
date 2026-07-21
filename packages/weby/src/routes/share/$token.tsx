/* eslint-disable @typescript-eslint/no-use-before-define */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";
import { useTheme } from "#/shared/hooks/use-theme";
import { useEffect, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { getEditorExtensions } from "#/features/editor/extensions";

interface PublicShareResponse {
  page: {
    id: string;
    title: string;
    icon: string;
    coverPhoto: string;
    contentJson: string;
    updatedAt: string;
  };
  share: {
    id: string;
    shareToken: string;
    shortCode: string | null;
    searchIndexing: boolean;
  };
}

const SharedPageComponent = () => {
  const { token } = Route.useParams();
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const { data, isPending, isError } = useQuery<PublicShareResponse>({
    queryFn: () => fetchProtected<PublicShareResponse>(`/api/shares/${token}`),
    queryKey: ["publicShare", token],
    retry: false,
  });

  useEffect(() => {
    if (!data) {
      return;
    }

    // Set SEO title
    if (data.page.title) {
      document.title = `${data.page.title} - shared via verso`;
    }

    // Handle SEO search engine indexing
    let createdMeta: HTMLMetaElement | null = null;
    if (!data.share.searchIndexing) {
      createdMeta = document.createElement("meta");
      createdMeta.setAttribute("name", "robots");
      createdMeta.setAttribute("content", "noindex");
      document.head.append(createdMeta);
    }

    return () => {
      createdMeta?.remove();
    };
  }, [data]);

  const content = useMemo(() => {
    if (!data?.page?.contentJson) {
      return {};
    }
    try {
      return JSON.parse(data.page.contentJson);
    } catch {
      return {};
    }
  }, [data?.page?.contentJson]);

  const editor = useEditor({
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: "outline-none border-none focus:outline-none focus:border-none focus:ring-0",
      },
    },
    extensions: getEditorExtensions(),
    immediatelyRender: false,
  });

  // Keep editor content in sync when loaded
  useEffect(() => {
    if (editor && !editor.isDestroyed && data?.page?.contentJson) {
      try {
        editor.commands.setContent(JSON.parse(data.page.contentJson));
      } catch (error) {
        console.error(error);
      }
    }
  }, [editor, data?.page?.contentJson]);

  if (isPending) {
    return (
      <div
        className={`min-h-screen w-full flex items-center justify-center text-xs lowercase ${t(
          "bg-bg-dark text-text-dark/40",
          "bg-bg-light text-text-light/40",
        )}`}
      >
        loading page...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div
        className={`min-h-screen w-full flex items-center justify-center text-xs lowercase text-red-400 ${t(
          "bg-bg-dark",
          "bg-bg-light",
        )}`}
      >
        page not found or sharing has been disabled
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen w-full overflow-y-auto select-text font-sans tracking-tight leading-relaxed ${t(
        "bg-bg-dark text-text-dark",
        "bg-bg-light text-text-light",
      )}`}
    >
      <div className="w-full blog-reader-prose px-4 mx-auto max-w-2xl pt-24 pb-32">
        <h1 className="w-full text-5xl font-black pt-8 pb-0 px-0 mb-0.5 font-sans tracking-tight leading-tight">
          {data.page.title || "Untitled"}
        </h1>
        <EditorContent editor={editor} />
      </div>

      {/* Watermark */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 text-[10px] lowercase select-none border px-2.5 py-1 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-neutral-800/10 dark:border-neutral-100/10 text-neutral-800/50 dark:text-neutral-100/50 shadow-sm">
        <img src="/verso.svg" alt="verso" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
        <span>
          shared via{" "}
          <a
            href="https://przknv.cc/about"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline text-neutral-800 dark:text-neutral-100"
          >
            verso
          </a>
        </span>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/share/$token")({
  component: SharedPageComponent,
});
