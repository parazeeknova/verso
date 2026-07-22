/* eslint-disable @typescript-eslint/no-use-before-define */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";
import { useAuth } from "#/features/auth/hooks/use-auth";
import { useTheme } from "#/shared/hooks/use-theme";
import { useEffect } from "react";
import { LockKeyIcon } from "@phosphor-icons/react";
import { PageEditor } from "#/features/editor/components/page-editor";

interface PublicShareResponse {
  page: {
    id: string;
    creatorId: string;
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
    accessLevel?: string;
  };
}

const SharedPageComponent = () => {
  const { token } = Route.useParams();
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const { data: user } = useAuth();

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
        className={`min-h-screen w-full flex flex-col items-center justify-center p-4 font-sans select-none ${t(
          "bg-bg-dark text-text-dark",
          "bg-bg-light text-text-light",
        )}`}
      >
        <div className="flex flex-col items-center text-center max-w-sm w-full p-6 rounded-2xl border bg-white/40 dark:bg-neutral-900/40 backdrop-blur-md border-neutral-200/60 dark:border-neutral-800/60 shadow-xl">
          <div className="h-10 w-10 rounded-full flex items-center justify-center mb-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 text-neutral-500 dark:text-neutral-400">
            <LockKeyIcon size={20} />
          </div>
          <h2 className="text-sm font-semibold tracking-tight mb-1 text-neutral-900 dark:text-neutral-100">
            page unavailable
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            this page isn't available or public sharing has been disabled by the owner.
          </p>
        </div>

        {/* Watermark */}
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 text-[10px] lowercase select-none border px-2.5 py-1 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-neutral-800/10 dark:border-neutral-100/10 text-neutral-800/50 dark:text-neutral-100/50 shadow-sm pointer-events-none">
          <img src="/verso.svg" alt="verso" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
          <span>
            shared via{" "}
            <a
              href="https://przknv.cc/about"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline text-neutral-800 dark:text-neutral-100 pointer-events-auto"
            >
              verso
            </a>
          </span>
        </div>
      </div>
    );
  }

  const accessLevel = data.share.accessLevel || "read";
  const canEdit =
    accessLevel === "public_edit" ||
    (!!user && (accessLevel === "edit" || accessLevel === "public_edit"));

  return (
    <div
      className={`h-screen w-full flex flex-col overflow-hidden font-sans tracking-tight leading-relaxed ${t(
        "bg-bg-dark text-text-dark",
        "bg-bg-light text-text-light",
      )}`}
    >
      <div className="flex-1 min-h-0 w-full relative">
        <PageEditor
          pageId={data.page.id}
          contentJson={data.page.contentJson}
          editable={canEdit}
          isLocked={false}
          title={data.page.title}
          creatorId={data.page.creatorId}
          updatedAt={data.page.updatedAt}
          isStandaloneShare={true}
        />
      </div>

      {/* Watermark */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 text-[10px] lowercase select-none border px-2.5 py-1 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-neutral-800/10 dark:border-neutral-100/10 text-neutral-800/50 dark:text-neutral-100/50 shadow-sm pointer-events-none">
        <img src="/verso.svg" alt="verso" className="h-3.5 w-3.5 shrink-0 rounded-sm" />
        <span>
          shared via{" "}
          <a
            href="https://przknv.cc/about"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline text-neutral-800 dark:text-neutral-100 pointer-events-auto"
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
