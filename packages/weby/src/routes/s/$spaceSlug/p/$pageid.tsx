import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTheme } from "#/shared/hooks/use-theme";
import { PageEditor } from "#/features/editor/components/page-editor";
import { useSpaceBySlug } from "#/features/console/hooks/use-spaces";
import { usePageBySpaceAndSlug } from "#/features/console/hooks/use-pages";

const PageView = () => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const { spaceSlug, pageid } = useParams({ from: "/s/$spaceSlug/p/$pageid" });
  const {
    data: space,
    isPending: isSpacePending,
    isError: isSpaceError,
  } = useSpaceBySlug(spaceSlug);
  const {
    data: page,
    isPending,
    isError,
  } = usePageBySpaceAndSlug(space?.id ?? "", pageid, { enabled: !!space?.id });

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.title = page?.title ? `verso — ${page.title}` : `verso — ${pageid}`;
    return () => {
      document.title = "verso — console";
    };
  }, [page?.title, pageid]);

  if (isSpacePending) {
    return (
      <div className="flex items-center justify-center pt-32">
        <p className={`text-[13px] lowercase ${t("text-text-dark/25", "text-text-light/25")}`}>
          loading space...
        </p>
      </div>
    );
  }

  if (isSpaceError || !space) {
    return (
      <div className="flex items-center justify-center pt-32">
        <p className={`text-[13px] lowercase ${t("text-text-dark/25", "text-text-light/25")}`}>
          space not found
        </p>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center pt-32">
        <p className={`text-[13px] lowercase ${t("text-text-dark/25", "text-text-light/25")}`}>
          loading page...
        </p>
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="flex items-center justify-center pt-32">
        <p className={`text-[13px] lowercase ${t("text-text-dark/25", "text-text-light/25")}`}>
          page not found
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageEditor
        contentJson={page.contentJson}
        editable={page.editable}
        isLocked={page.isLocked}
        pageId={page.id}
        title={page.title}
        spaceName={space.name}
        spaceSlug={spaceSlug}
        creatorId={page.creatorId}
        createdAt={page.createdAt}
        updatedAt={page.updatedAt}
        textContent={page.textContent}
      />
    </div>
  );
};

export const Route = createFileRoute("/s/$spaceSlug/p/$pageid")({
  component: PageView,
});
