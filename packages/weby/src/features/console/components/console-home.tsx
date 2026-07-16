import { FileTextIcon, PlusIcon } from "@phosphor-icons/react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "#/features/auth/hooks/use-auth";
import { AvatarBadge } from "#/shared/components/avatar-badge";
import { useTheme } from "#/shared/hooks/use-theme";
import { useConsolePages } from "#/features/console/hooks/use-pages";
import { useCreateSpace, useSpaces } from "#/features/console/hooks/use-spaces";
import { useConsoleContext } from "./console-context";
import { QuickActions } from "./quick-actions";

const subMessages = [
  "hope you're having a good day",
  "ready to build something ?",
  "what's on your mind today ?",
  "stay curious, stay building",
  "your second brain is here",
  "ideas don't wait, write them down",
  "let's make something cool",
  "back at it again huh",
  "coffee first, docs second",
  "your workspace misses you",
  "quiet time, loud ideas",
  "build in public, stay humble",
  "one doc at a time",
  "the void is staring back",
  "no pressure, just progress",
  "write it before you forget it",
  "consistency over intensity",
  "ship it when it's ready",
  "think deeply, write simply",
];

const createSubMessages = [
  "a home for your docs",
  "build something together",
  "your team's second brain",
  "where ideas take shape",
  "a space for everything",
];

export const ConsoleHome = () => {
  const { data: user } = useAuth();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { selectedWorkspaceId } = useConsoleContext();
  const { data: spaces } = useSpaces(selectedWorkspaceId);
  const spaceById = useMemo(() => {
    const map = new Map<string, { name: string; slug: string }>();
    for (const s of spaces ?? []) {
      map.set(s.id, { name: s.name, slug: s.slug });
    }
    return map;
  }, [spaces]);
  const { data: allPages, isPending: allPagesPending } = useConsolePages();
  const pageById = useMemo(() => new Map((allPages ?? []).map((p) => [p.id, p])), [allPages]);
  const createSpace = useCreateSpace();
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [createError, setCreateError] = useState("");
  const createBtnRef = useRef<HTMLButtonElement>(null);

  const handleNameChange = (value: string) => {
    setNewName(value);
    if (value.trim()) {
      setNewSlug(
        value
          .toLowerCase()
          .trim()
          .replaceAll(/[^\w\s-]/g, "")
          .replaceAll(/[\s_-]+/g, "-")
          .replaceAll(/^-+|-+$/g, ""),
      );
    }
  };

  const handleCreateSpace = () => {
    setCreateError("");
    if (!newName.trim()) {
      setCreateError("name is required");
      return;
    }
    if (!newSlug.trim() || !selectedWorkspaceId) {
      return;
    }
    createSpace.mutate(
      {
        description: newDescription.trim() || undefined,
        name: newName.trim(),
        slug: newSlug.trim(),
        workspaceId: selectedWorkspaceId,
      },
      {
        onError: (err: Error) => {
          setCreateError(err.message || "failed to create space");
        },
        onSuccess: () => {
          setShowCreateSpace(false);
          setNewName("");
          setNewSlug("");
          setNewDescription("");
        },
      },
    );
  };

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const now = useMemo(() => new Date(), []);
  const hour = now.getHours();
  const greeting = (() => {
    if (hour < 5) {
      return "moonlit thoughts";
    }
    if (hour < 7) {
      return "early riser";
    }
    if (hour < 9) {
      return "good morning";
    }
    if (hour < 12) {
      return "late morning";
    }
    if (hour < 14) {
      return "good afternoon";
    }
    if (hour < 17) {
      return "golden hour";
    }
    if (hour < 19) {
      return "good evening";
    }
    if (hour < 21) {
      return "night owl mode";
    }
    if (hour < 23) {
      return "late night grind";
    }
    return "moonlit thoughts";
  })();
  const dateStr = now.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });

  const subMessage = useMemo(() => subMessages[Math.floor(Math.random() * subMessages.length)], []);

  const mySpaces = (spaces ?? []).filter((s) => s.slug !== "nospace");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 pt-12 min-h-full">
      <div className="flex items-center justify-between">
        <h1 className={`text-lg lowercase ${t("text-text-dark", "text-text-light")}`}>
          {greeting}, {user?.name || `@${user?.username}`}
        </h1>
        <span
          className={`shrink-0 text-[10px] lowercase ${t("text-text-dark/20", "text-text-light/20")}`}
        >
          {dateStr}
        </span>
      </div>
      <p className={`mt-1 text-[12px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}>
        {subMessage}
      </p>

      <QuickActions />

      <div className="mt-10" id="library-section">
        <div className="flex items-center justify-between mb-3">
          <p className={`text-[11px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}>
            spaces you belong to
          </p>
          <button
            className={`text-[10px] lowercase ${t("text-text-dark/25 hover:text-text-dark/50", "text-text-light/25 hover:text-text-light/50")}`}
            onClick={() => navigate({ search: { workspace: undefined }, to: "/settings/spaces" })}
            type="button"
          >
            view all
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {mySpaces.map((s) => (
            <button
              key={s.id}
              className={`w-44 shrink-0 border px-3 py-2 text-left lowercase bg-linear-to-b ${t("border-border-dark from-white/3 to-transparent hover:bg-white/5", "border-border-light from-black/2 to-transparent hover:bg-black/3")}`}
              onClick={() => navigate({ to: `/s/${s.slug}` })}
              type="button"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <AvatarBadge
                    className={`w-5 h-5 ${t("bg-white/10 text-text-dark/70", "bg-black/10 text-text-light/70")}`}
                    icon={s.icon}
                    name={s.name}
                  />
                  <p
                    className={`text-[13px] truncate ${t("text-text-dark/70", "text-text-light/70")}`}
                  >
                    {s.name}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[9px] font-mono ${t("text-text-dark/20", "text-text-light/20")}`}
                >
                  {s.memberCount}
                </span>
              </div>
              <p
                className={`mt-1.5 text-[10px] line-clamp-2 ${t("text-text-dark/30", "text-text-light/30")}`}
              >
                {s.description || "\u00A0"}
              </p>
            </button>
          ))}
          <button
            className={`w-44 shrink-0 border border-dashed px-3 py-2 text-left lowercase bg-linear-to-b ${t("border-border-dark from-white/3 to-transparent hover:bg-white/5 text-text-dark/25 hover:text-text-dark/40", "border-border-light from-black/2 to-transparent hover:bg-black/3 text-text-light/25 hover:text-text-light/40")}`}
            onClick={() => {
              setShowCreateSpace(true);
              setNewName("");
              setNewSlug("");
              setNewDescription("");
              setCreateError("");
            }}
            type="button"
          >
            <div className="flex items-center gap-2">
              <PlusIcon size={14} />
              <p className="text-[13px]">create space</p>
            </div>
            <p
              className={`mt-1.5 text-[10px] line-clamp-2 ${t("text-text-dark/20", "text-text-light/20")}`}
            >
              {createSubMessages[Math.floor(Math.random() * createSubMessages.length)]}
            </p>
          </button>
        </div>
      </div>
      {showCreateSpace && (
        <div
          className="fixed inset-0 z-50"
          onClick={() => setShowCreateSpace(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setShowCreateSpace(false);
            }
          }}
          role="dialog"
        >
          <div
            className={`absolute border p-3 w-52 shadow-lg ${t("border-border-dark bg-text-light", "border-border-light bg-[#e0e0e0]")}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="document"
            style={{
              left: createBtnRef.current
                ? `${createBtnRef.current.getBoundingClientRect().left}px`
                : "50%",
              top: createBtnRef.current
                ? `${createBtnRef.current.getBoundingClientRect().bottom + 4}px`
                : "50%",
            }}
          >
            <p
              className={`mb-2 text-[10px] uppercase tracking-wider ${t("text-text-dark/30", "text-text-light/30")}`}
            >
              new space
            </p>
            <input
              autoFocus
              className={`w-full bg-transparent border-b py-1 text-[11px] lowercase outline-none ${t("border-border-dark text-text-dark placeholder:text-text-dark/20", "border-border-light text-text-light placeholder:text-text-light/20")}`}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateSpace();
                }
                if (e.key === "Escape") {
                  setShowCreateSpace(false);
                }
              }}
              placeholder="name"
              value={newName}
            />
            <input
              className={`mt-2 w-full bg-transparent border-b py-1 text-[11px] lowercase outline-none ${t("border-border-dark text-text-dark/50 placeholder:text-text-dark/20", "border-border-light text-text-light/50 placeholder:text-text-light/20")}`}
              onChange={(e) => setNewSlug(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateSpace();
                }
                if (e.key === "Escape") {
                  setShowCreateSpace(false);
                }
              }}
              placeholder="slug"
              value={newSlug}
            />
            <input
              className={`mt-2 w-full bg-transparent border-b py-1 text-[11px] lowercase outline-none ${t("border-border-dark text-text-dark/50 placeholder:text-text-dark/20", "border-border-light text-text-light/50 placeholder:text-text-light/20")}`}
              onChange={(e) => setNewDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateSpace();
                }
                if (e.key === "Escape") {
                  setShowCreateSpace(false);
                }
              }}
              placeholder="description"
              value={newDescription}
            />
            <div className="mt-2 flex gap-2">
              <button
                className={`text-[11px] lowercase px-2 py-0.5 ${t("bg-white/10 text-text-dark/80 hover:bg-white/20", "bg-black/10 text-text-light/80 hover:bg-black/20")}`}
                disabled={createSpace.isPending || !newName.trim()}
                onClick={handleCreateSpace}
                type="button"
              >
                {createSpace.isPending ? "creating..." : "create"}
              </button>
              <button
                className={`text-[11px] lowercase px-2 py-0.5 ${t("text-text-dark/40 hover:text-text-dark", "text-text-light/40 hover:text-text-light")}`}
                onClick={() => setShowCreateSpace(false)}
                type="button"
              >
                cancel
              </button>
            </div>
            {createError && (
              <p className={`mt-1 text-[10px] lowercase ${t("text-red-400", "text-red-600")}`}>
                {createError}
              </p>
            )}
          </div>
        </div>
      )}

      <div
        className={`mt-8 border-t pt-5 ${t("border-border-dark", "border-border-light")}`}
        id="recent-docs-section"
      >
        <p className={`text-[11px] lowercase ${t("text-text-dark/30", "text-text-light/30")}`}>
          my pages
        </p>

        <div className="mt-3 space-y-0.5">
          {(() => {
            if (allPagesPending) {
              return (
                <p className={`text-[11px] ${t("text-text-dark/25", "text-text-light/25")}`}>
                  loading...
                </p>
              );
            }
            const recent = (allPages ?? [])
              .filter((p) => !p.slugId.includes("/") && p.icon !== "folder")
              .toSorted((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 5);
            if (recent.length === 0) {
              return (
                <p className={`text-[11px] ${t("text-text-dark/25", "text-text-light/25")}`}>
                  no pages yet
                </p>
              );
            }
            return recent.map((page) => {
              const parentTitle = page.parentPageId
                ? pageById.get(page.parentPageId)?.title
                : undefined;
              const space = spaceById.get(page.spaceId);
              return (
                <button
                  key={page.id}
                  className={`w-full grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 py-1.5 lowercase text-left ${t("hover:bg-white/5", "hover:bg-black/3")}`}
                  onClick={() => {
                    const slug = space ? space.slug : "nospace";
                    navigate({
                      params: { pageid: page.slugId, spaceSlug: slug },
                      to: "/s/$spaceSlug/p/$pageid",
                    });
                  }}
                  type="button"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileTextIcon
                      className={t("text-text-dark/25", "text-text-light/25")}
                      size={14}
                    />
                    <span
                      className={`truncate text-[12px] ${t("text-text-dark/60", "text-text-light/60")}`}
                    >
                      {page.title}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] lowercase truncate max-w-32 text-center ${t("text-text-dark/20", "text-text-light/20")}`}
                  >
                    {parentTitle ? `${parentTitle} / ${space?.name || "—"}` : space?.name || "—"}
                  </span>
                  <span
                    className={`shrink-0 text-[10px] font-mono text-right ${t("text-text-dark/25", "text-text-light/25")}`}
                  >
                    {new Date(page.updatedAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </button>
              );
            });
          })()}
        </div>
      </div>
      <p
        className={`sticky bottom-0 mt-auto pb-4 pt-2 text-center text-[10px] lowercase transition-colors duration-500 ease-out ${t("text-text-dark/20 bg-bg-dark/80", "text-text-light/20 bg-bg-light/80")}`}
      >
        spotted a bug or have a suggestion ?{" "}
        <a
          className="underline hover:opacity-70"
          href="https://github.com/parazeeknova/verso/issues"
          rel="noopener noreferrer"
          target="_blank"
        >
          report it here
        </a>
      </p>
    </div>
  );
};
