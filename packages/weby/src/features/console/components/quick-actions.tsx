import {
  ClockCounterClockwiseIcon,
  FileTextIcon,
  FolderOpenIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTheme } from "#/shared/hooks/use-theme";
import { useConsolePages, useCreatePage } from "#/features/console/hooks/use-pages";
import { useSpaces } from "#/features/console/hooks/use-spaces";
import { useConsoleContext } from "./console-context";

const ActionTile = ({
  icon: Icon,
  label,
  description,
  onClick,
  isDarkMode,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  description: string;
  onClick: () => void;
  isDarkMode: boolean;
}) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  return (
    <button
      className={`group flex flex-col border px-3 py-2.5 text-left lowercase bg-linear-to-b transition-colors ${t(
        "border-border-dark from-white/3 to-transparent hover:bg-white/5",
        "border-border-light from-black/2 to-transparent hover:bg-black/3",
      )}`}
      onClick={onClick}
      type="button"
    >
      <Icon
        className={t(
          "text-text-dark/25 group-hover:text-text-dark/50",
          "text-text-light/25 group-hover:text-text-light/50",
        )}
        size={16}
      />
      <p
        className={`mt-2 text-[12px] ${t("text-text-dark/60 group-hover:text-text-dark/90", "text-text-light/60 group-hover:text-text-light/90")}`}
      >
        {label}
      </p>
      <p className={`mt-0.5 text-[10px] ${t("text-text-dark/25", "text-text-light/25")}`}>
        {description}
      </p>
    </button>
  );
};

export const QuickActions = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { selectedWorkspaceId, selectedSpaceId } = useConsoleContext();
  const { data: pages } = useConsolePages();
  const { data: spaces } = useSpaces(selectedWorkspaceId);
  const createPage = useCreatePage();

  const [newTitle, setNewTitle] = useState("");
  const [showNewPage, setShowNewPage] = useState(false);

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const hasPages = (pages?.length ?? 0) > 0;

  const handleCreatePage = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      return;
    }
    const slug = trimmed
      .toLowerCase()
      .trim()
      .replaceAll(/[^\w\s-]/g, "")
      .replaceAll(/[\s_-]+/g, "-")
      .replaceAll(/^-+|-+$/g, "");
    const spaceId = selectedSpaceId || spaces?.[0]?.id || "";
    createPage.mutate(
      { slugId: slug, spaceId, title: trimmed, workspaceId: selectedWorkspaceId || "" },
      {
        onSuccess: (data) => {
          setNewTitle("");
          setShowNewPage(false);
          const space = spaces?.find((s) => s.id === data.spaceId);
          const spaceSlug = space ? space.slug : "nospace";
          navigate({
            params: { pageid: data.slugId, spaceSlug },
            to: "/s/$spaceSlug/p/$pageid",
          });
        },
      },
    );
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <p className={`text-[11px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}>
          quick actions
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ActionTile
          description="create a new doc"
          icon={PlusIcon}
          isDarkMode={isDarkMode}
          label="new page"
          onClick={() => {
            setShowNewPage(true);
            setNewTitle("");
          }}
        />

        <ActionTile
          description="recently edited"
          icon={ClockCounterClockwiseIcon}
          isDarkMode={isDarkMode}
          label="view recents"
          onClick={() => {
            const el = document.querySelector("#recent-docs-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        <ActionTile
          description="browse your library"
          icon={FileTextIcon}
          isDarkMode={isDarkMode}
          label="library"
          onClick={() => {
            const el = document.querySelector("#library-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        {hasPages && (
          <ActionTile
            description="manage spaces"
            icon={FolderOpenIcon}
            isDarkMode={isDarkMode}
            label="spaces"
            onClick={() => {
              navigate({ search: { workspace: undefined }, to: "/settings/spaces" });
            }}
          />
        )}
      </div>

      {showNewPage && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20"
          onClick={() => setShowNewPage(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowNewPage(false)}
          role="dialog"
        >
          <div
            className={`border w-80 shadow-lg ${t("border-border-dark bg-bg-dark", "border-border-light bg-bg-light")}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="document"
          >
            <div
              className={`flex items-center gap-2 px-3 py-1.5 border-b ${t("border-border-dark", "border-border-light")}`}
            >
              <PlusIcon size={12} className={t("text-text-dark/30", "text-text-light/30")} />
              <span
                className={`text-[9px] uppercase tracking-widest ${t("text-text-dark/20", "text-text-light/20")}`}
              >
                new page
              </span>
            </div>
            <div className="px-3 py-2">
              <input
                autoFocus
                className={`w-full bg-transparent border-b py-1 text-[12px] lowercase outline-none ${t(
                  "border-border-dark text-text-dark placeholder:text-text-dark/20",
                  "border-border-light text-text-light placeholder:text-text-light/20",
                )}`}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreatePage();
                  }
                  if (e.key === "Escape") {
                    setShowNewPage(false);
                  }
                }}
                placeholder="page title"
                value={newTitle}
              />
              <div className="mt-3 flex items-center justify-between">
                <button
                  className={`text-[11px] lowercase px-2 py-1 border ${t(
                    "border-border-dark text-text-dark/60 hover:bg-white/5 hover:text-text-dark",
                    "border-border-light text-text-light/60 hover:bg-black/3 hover:text-text-light",
                  )} ${newTitle.trim() ? "" : "opacity-30 pointer-events-none"}`}
                  disabled={createPage.isPending || !newTitle.trim()}
                  onClick={handleCreatePage}
                  type="button"
                >
                  {createPage.isPending ? "creating..." : "create"}
                </button>
                <button
                  className={`text-[11px] lowercase px-2 py-1 ${t(
                    "text-text-dark/30 hover:text-text-dark/60",
                    "text-text-light/30 hover:text-text-light/60",
                  )}`}
                  onClick={() => setShowNewPage(false)}
                  type="button"
                >
                  cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
