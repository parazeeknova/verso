import {
  BookmarkSimpleIcon,
  CaretDownIcon,
  CaretRightIcon,
  DotsThreeCircleVerticalIcon,
  FileTextIcon,
  FolderIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { PageTreeItem, Space } from "#/shared/types";
import { fetchProtected } from "#/features/auth/hooks/fetch-protected";
import { AvatarBadge } from "#/shared/components/avatar-badge";
import {
  useDeletePage,
  useMovePage,
  usePageTree,
  useUpdatePage,
} from "#/features/console/hooks/use-pages";
import {
  useFavoritedPages,
  useIsPageFavorited,
  useTogglePageFavorite,
} from "#/features/console/hooks/use-page-favorites";
import { useQueries } from "@tanstack/react-query";
import { useSpaces, useFavoritedSpaces } from "#/features/console/hooks/use-spaces";
import { useTheme } from "#/shared/hooks/use-theme";
import { useConsoleContext } from "./console-context";
import { useNavigate } from "@tanstack/react-router";
import { setFlashToast } from "#/features/console/components/flash-toast";

interface TreeNode {
  item: PageTreeItem;
  children: TreeNode[];
}

const buildPageTree = (items: PageTreeItem[]): TreeNode[] => {
  if (!items || items.length === 0) {
    return [];
  }
  const byParent = new Map<string | null, PageTreeItem[]>();
  for (const item of items) {
    const key = item.parentPageId;
    const list = byParent.get(key);
    if (list) {
      list.push(item);
    } else {
      byParent.set(key, [item]);
    }
  }
  const build = (parentId: string | null): TreeNode[] => {
    const children = byParent.get(parentId) ?? [];
    return children.map((item) => ({
      children: build(item.id),
      item,
    }));
  };
  return build(null);
};

const isDescendant = (items: PageTreeItem[], ancestorId: string, descendantId: string): boolean => {
  const parentMap = new Map(items.map((i) => [i.id, i.parentPageId]));
  const visited = new Set<string>();
  let current: string | null | undefined = descendantId;
  while (current) {
    if (visited.has(current)) {
      return false;
    }
    visited.add(current);
    const parent = parentMap.get(current);
    if (parent === ancestorId) {
      return true;
    }
    if (!parent) {
      return false;
    }
    current = parent;
  }
  return false;
};

interface PageNodeProps {
  node: TreeNode;
  depth: number;
  treeItems: PageTreeItem[];
  spaceSlug: string;
}

const PageNode = ({ node, depth, treeItems, spaceSlug }: PageNodeProps) => {
  const { isDarkMode } = useTheme();
  const { selectedPageId, setSelectedPageId } = useConsoleContext();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isSubmittingRef = useRef(false);

  const { data: favData } = useIsPageFavorited(node.item.id);
  const toggleFav = useTogglePageFavorite();
  const isFaved = favData?.favorited ?? false;

  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const movePage = useMovePage();

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const hasChildren = node.children.length > 0 || node.item.icon === "folder";
  const isSelected = selectedPageId === node.item.id;

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setShowDeleteConfirm(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleDotsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ x: rect.right, y: rect.bottom + 2 });
    setMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setShowDeleteConfirm(false);
  };

  const startRename = () => {
    setRenameTitle(node.item.title);
    setIsRenaming(true);
    closeMenu();
  };

  const submitRename = () => {
    if (isSubmittingRef.current) {
      return;
    }
    const trimmed = renameTitle.trim();
    if (!trimmed || trimmed === node.item.title) {
      setIsRenaming(false);
      return;
    }
    isSubmittingRef.current = true;
    updatePage.mutate(
      { id: node.item.id, input: { title: trimmed } },
      {
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      },
    );
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      submitRename();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
    }
  };

  const submitDelete = () => {
    const shouldRedirect =
      selectedPageId === node.item.id ||
      (selectedPageId ? isDescendant(treeItems, node.item.id, selectedPageId) : false);
    deletePage.mutate(node.item.id, {
      onSuccess: () => {
        if (shouldRedirect) {
          if (spaceSlug === "nospace") {
            navigate({ to: "/home" });
          } else {
            navigate({
              params: { spaceSlug },
              to: "/s/$spaceSlug",
            });
          }
        }
      },
    });
    setMenuOpen(false);
    setShowDeleteConfirm(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", node.item.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (hasChildren) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (
      draggedId &&
      draggedId !== node.item.id &&
      !isDescendant(treeItems, draggedId, node.item.id)
    ) {
      movePage.mutate({ id: draggedId, input: { parentPageId: node.item.id } });
    }
  };

  return (
    <li>
      <div
        className={`flex group w-full items-center gap-1 py-0.5 text-[11px] lowercase ${t(
          isSelected
            ? "bg-white/10 text-text-dark"
            : "text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80",
          isSelected
            ? "bg-black/10 text-text-light"
            : "text-text-light/50 hover:bg-black/3 hover:text-text-light/80",
        )}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          closeMenu();
        }}
        draggable
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
      >
        {hasChildren ? (
          <>
            <button
              className="shrink-0 cursor-pointer"
              onClick={() => setExpanded((prev) => !prev)}
              type="button"
            >
              {expanded ? <CaretDownIcon size={10} /> : <CaretRightIcon size={10} />}
            </button>
            <FolderIcon className="shrink-0" size={10} />
          </>
        ) : (
          <FileTextIcon className="shrink-0" size={10} />
        )}

        {isRenaming ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              ref={renameInputRef}
              className={`flex-1 bg-transparent outline-none text-[11px] lowercase border-b ${t("border-white/20 text-text-dark", "border-black/20 text-text-light")}`}
              onBlur={submitRename}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              value={renameTitle}
            />
            <button
              className={`shrink-0 text-[10px] lowercase px-1 cursor-pointer ${t("text-text-dark/40 hover:text-text-dark", "text-text-light/40 hover:text-text-light")}`}
              onClick={submitRename}
              type="button"
            >
              save
            </button>
            <button
              className={`shrink-0 text-[10px] lowercase px-1 cursor-pointer ${t("text-text-dark/25 hover:text-text-dark/60", "text-text-light/25 hover:text-text-light/60")}`}
              onClick={() => setIsRenaming(false)}
              type="button"
            >
              cancel
            </button>
          </div>
        ) : (
          <button
            className="flex-1 text-left truncate"
            onClick={() => {
              if (hasChildren) {
                setExpanded((prev) => !prev);
              } else {
                setSelectedPageId(node.item.id);
                navigate({
                  params: { pageid: node.item.slugId, spaceSlug },
                  to: "/s/$spaceSlug/p/$pageid",
                });
              }
            }}
            type="button"
          >
            {node.item.title}
          </button>
        )}

        {isHovered && !isRenaming && (
          <div className="flex items-center gap-0.5 shrink-0 pr-0.5">
            {hasChildren ? (
              <button
                className="cursor-pointer opacity-60 hover:opacity-100 flex items-center"
                onClick={() => setSelectedPageId(node.item.id)}
                title="Open folder"
                type="button"
              >
                <PlusIcon size={10} />
              </button>
            ) : (
              <button
                className={`cursor-pointer flex items-center ${isFaved ? "text-yellow-400" : "opacity-60 hover:opacity-100"}`}
                onClick={() => toggleFav.mutate(node.item.id)}
                type="button"
              >
                <BookmarkSimpleIcon size={10} weight={isFaved ? "fill" : "regular"} />
              </button>
            )}
            <div className="flex items-center" ref={menuRef}>
              <button
                className="cursor-pointer opacity-60 hover:opacity-100 flex items-center"
                onClick={handleDotsClick}
                type="button"
              >
                <DotsThreeCircleVerticalIcon size={10} />
              </button>
              {menuOpen && menuPos && (
                <div
                  className={`fixed z-9999 py-1 w-32 text-[11px] lowercase shadow-lg ${t(
                    "bg-neutral-800 border border-white/10 text-text-dark",
                    "bg-white border border-black/10 text-text-light",
                  )}`}
                  style={{ left: `${menuPos.x - 128}px`, top: `${menuPos.y}px` }}
                >
                  <button
                    className={`flex w-full items-center gap-1.5 px-2 py-1 cursor-pointer ${t("hover:bg-white/10", "hover:bg-black/5")}`}
                    onClick={startRename}
                    type="button"
                  >
                    <PencilSimpleIcon size={10} />
                    rename
                  </button>
                  <button
                    className={`flex w-full items-center gap-1.5 px-2 py-1 cursor-pointer ${showDeleteConfirm ? "text-red-400" : t("hover:bg-white/10", "hover:bg-black/5")}`}
                    onClick={() => {
                      if (showDeleteConfirm) {
                        submitDelete();
                      } else {
                        setShowDeleteConfirm(true);
                      }
                    }}
                    type="button"
                  >
                    <TrashIcon size={10} />
                    {showDeleteConfirm ? "confirm?" : "delete"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {expanded && hasChildren && (
        <ul>
          {node.children.map((child) => (
            <PageNode
              depth={depth + 1}
              key={child.item.id}
              node={child}
              treeItems={treeItems}
              spaceSlug={spaceSlug}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

interface SpaceTreeNodeProps {
  space: Space;
  defaultExpanded: boolean;
}

const SpaceTreeNode = ({ space, defaultExpanded }: SpaceTreeNodeProps) => {
  const { isDarkMode } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { data: treeItems, isPending, isError } = usePageTree(space.id);

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const pageTree = treeItems ? buildPageTree(treeItems) : [];

  return (
    <div>
      <button
        className={`flex w-full items-center gap-1 px-1 py-0.5 text-[11px] lowercase ${t(
          "text-text-dark/60 hover:text-text-dark/80",
          "text-text-light/60 hover:text-text-light/80",
        )}`}
        onClick={() => setExpanded((prev) => !prev)}
        type="button"
      >
        {expanded ? <CaretDownIcon size={10} /> : <CaretRightIcon size={10} />}
        <AvatarBadge
          className={`mx-0.5 h-3.5 w-3.5 ${t("bg-white/10 text-text-dark/60", "bg-black/5 text-text-light/60")}`}
          icon={space.icon}
          name={space.name}
        />
        <span className="truncate">{space.name}</span>
      </button>
      {expanded && (
        <div className="pl-2">
          {(() => {
            if (isPending) {
              return (
                <p
                  className={`px-1 py-0.5 text-[10px] ${t("text-text-dark/25", "text-text-light/25")}`}
                >
                  loading...
                </p>
              );
            }
            if (isError) {
              return <p className="px-1 py-0.5 text-[10px] text-red-400">failed to load</p>;
            }
            if (pageTree.length === 0) {
              return (
                <p
                  className={`px-1 py-0.5 text-[10px] ${t("text-text-dark/25", "text-text-light/25")}`}
                >
                  no files here
                </p>
              );
            }
            return (
              <ul>
                {pageTree.map((node) => (
                  <PageNode
                    depth={0}
                    key={node.item.id}
                    node={node}
                    treeItems={treeItems}
                    spaceSlug={space.slug}
                  />
                ))}
              </ul>
            );
          })()}
        </div>
      )}
    </div>
  );
};

const IndependentPagesList = ({ spaceId, spaceSlug }: { spaceId: string; spaceSlug: string }) => {
  const { isDarkMode } = useTheme();
  const { data: treeItems, isPending, isError } = usePageTree(spaceId);
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const pageTree = treeItems ? buildPageTree(treeItems) : [];

  if (isPending) {
    return (
      <p className={`px-1 py-0.5 text-[10px] ${t("text-text-dark/25", "text-text-light/25")}`}>
        loading pages...
      </p>
    );
  }
  if (isError) {
    return <p className="px-1 py-0.5 text-[10px] text-red-400">failed to load pages</p>;
  }
  if (pageTree.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <p
        className={`px-1 mb-1 text-[10px] uppercase tracking-wider ${t("text-text-dark/30", "text-text-light/30")}`}
      >
        pages
      </p>
      <div className="space-y-0.5 pl-1">
        {pageTree.map((node) => (
          <PageNode
            depth={0}
            key={node.item.id}
            node={node}
            treeItems={treeItems}
            spaceSlug={spaceSlug}
          />
        ))}
      </div>
    </div>
  );
};

interface FavoritedPagesListProps {
  favPageIds: string[];
  favSpaces: Space[];
}

interface FavPageDetail {
  id: string;
  title: string;
  slugId: string;
  spaceId: string;
}

const FavoritedPagesList = ({ favPageIds, favSpaces }: FavoritedPagesListProps) => {
  const { isDarkMode } = useTheme();
  const { setSelectedPageId } = useConsoleContext();
  const navigate = useNavigate();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const pageQueries = useQueries({
    queries: favPageIds.map((pageId) => ({
      enabled: !!pageId,
      queryFn: async () => {
        const res = await fetchProtected<FavPageDetail>(
          `/api/console/pages/${encodeURIComponent(pageId)}`,
        );
        return res;
      },
      queryKey: ["consolePage", pageId],
      staleTime: 60 * 1000,
    })),
  });

  const pages = pageQueries.map((q) => q.data).filter((p): p is FavPageDetail => p !== undefined);

  const activeFavSpaces = favSpaces.filter((s) => s.slug !== "nospace");
  const favSpaceIds = new Set(activeFavSpaces.map((s) => s.id));
  const pagesBySpace = new Map<string, FavPageDetail[]>();
  const ungrouped: FavPageDetail[] = [];

  for (const page of pages) {
    if (favSpaceIds.has(page.spaceId)) {
      const list = pagesBySpace.get(page.spaceId);
      if (list) {
        list.push(page);
      } else {
        pagesBySpace.set(page.spaceId, [page]);
      }
    } else {
      ungrouped.push(page);
    }
  }

  return (
    <>
      {activeFavSpaces.map((space) => {
        const spacePages = pagesBySpace.get(space.id);
        return (
          <div key={space.id}>
            <a
              className={`flex items-center gap-2 px-1 py-1 text-[11px] lowercase ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
              href={`/s/${space.slug}`}
            >
              <AvatarBadge
                className="w-4 h-4"
                icon={space.icon || null}
                initialsClass="text-[0.25rem]"
                name={space.name}
              />
              <span className="flex-1 truncate">{space.name}</span>
              <span
                className={`shrink-0 text-[8px] px-1 py-0.5 lowercase ${t("text-text-dark/25", "text-text-light/25")}`}
              >
                space
              </span>
            </a>
            {(spacePages ?? []).map((page, i, arr) => (
              <button
                className={`flex items-center gap-1 pl-6 pr-1 py-0.5 text-[11px] lowercase w-full text-left ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
                key={page.id}
                onClick={() => {
                  setSelectedPageId(page.id);
                  navigate({
                    params: { pageid: page.slugId, spaceSlug: space.slug },
                    to: "/s/$spaceSlug/p/$pageid",
                  });
                }}
                type="button"
              >
                <span className={`shrink-0 ${t("text-text-dark/20", "text-text-light/20")}`}>
                  {i === arr.length - 1 ? "\u2514" : "\u251C"}
                </span>
                <FileTextIcon size={10} />
                <span className="flex-1 truncate">{page.title}</span>
                <span
                  className={`shrink-0 text-[8px] px-1 py-0.5 lowercase ${t("text-text-dark/25", "text-text-light/25")}`}
                >
                  page
                </span>
              </button>
            ))}
          </div>
        );
      })}
      {ungrouped.map((page) => (
        <button
          className={`flex items-center gap-2 px-1 py-0.5 text-[11px] lowercase w-full text-left ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
          key={page.id}
          onClick={async () => {
            setSelectedPageId(page.id);
            try {
              const spaceData = await fetchProtected<{ slug: string }>(
                `/api/console/spaces/${encodeURIComponent(page.spaceId)}`,
              );
              navigate({
                params: { pageid: page.slugId, spaceSlug: spaceData.slug },
                to: "/s/$spaceSlug/p/$pageid",
              });
            } catch (error) {
              console.error("failed to fetch space for page:", error);
              setFlashToast("failed to load space");
            }
          }}
          type="button"
        >
          <FileTextIcon size={10} />
          <span className="flex-1 truncate">{page.title}</span>
          <span
            className={`shrink-0 text-[8px] px-1 py-0.5 lowercase ${t("text-text-dark/25", "text-text-light/25")}`}
          >
            page
          </span>
        </button>
      ))}
    </>
  );
};

export const FileTreeSidebar = () => {
  const { isDarkMode } = useTheme();
  const { selectedWorkspaceId, selectedSpaceId } = useConsoleContext();
  const { data: spaces, isPending, isError } = useSpaces(selectedWorkspaceId);
  const { data: favSpaces } = useFavoritedSpaces();
  const { data: favPageIds } = useFavoritedPages();

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  return (
    <>
      <div className="mb-1 flex items-center justify-between px-1">
        <p
          className={`text-[10px] uppercase tracking-wider ${t("text-text-dark/30", "text-text-light/30")}`}
        >
          my files
        </p>
        <button
          className={`text-[10px] uppercase tracking-wider ${t("text-text-dark/20 hover:text-text-dark/40", "text-text-light/20 hover:text-text-light/40")}`}
          type="button"
        >
          + new
        </button>
      </div>
      <div className="max-h-[45%] overflow-y-auto">
        {(() => {
          if (!selectedWorkspaceId) {
            return (
              <p className={`px-1 text-[11px] ${t("text-text-dark/25", "text-text-light/25")}`}>
                select a workspace
              </p>
            );
          }
          if (isPending) {
            return (
              <p className={`px-1 text-[11px] ${t("text-text-dark/25", "text-text-light/25")}`}>
                loading spaces...
              </p>
            );
          }
          if (isError) {
            return <p className="px-1 text-[11px] text-red-400">failed to load spaces</p>;
          }
          const activeSpaces = spaces ? spaces.filter((s) => s.slug !== "nospace") : [];
          if (activeSpaces.length === 0) {
            return (
              <p className={`px-1 text-[11px] ${t("text-text-dark/25", "text-text-light/25")}`}>
                no spaces yet
              </p>
            );
          }
          return (
            <div className="space-y-0.5">
              {activeSpaces.map((space) => {
                const isSelected = selectedSpaceId === space.id;
                return <SpaceTreeNode defaultExpanded={isSelected} key={space.id} space={space} />;
              })}
            </div>
          );
        })()}
        {(() => {
          const nospace = spaces?.find((s) => s.slug === "nospace");
          if (nospace) {
            return <IndependentPagesList spaceId={nospace.id} spaceSlug="nospace" />;
          }
          return null;
        })()}
      </div>
      <div className="mt-4">
        <p
          className={`px-1 mb-1 text-[10px] uppercase tracking-wider ${t("text-text-dark/30", "text-text-light/30")}`}
        >
          favorites
        </p>
        {(() => {
          const hasFavs =
            (favSpaces !== undefined && favSpaces.length > 0) ||
            (favPageIds !== undefined && favPageIds.length > 0);
          if (!hasFavs) {
            return (
              <p className={`px-1 text-[11px] ${t("text-text-dark/25", "text-text-light/25")}`}>
                no favorites yet
              </p>
            );
          }
          return (
            <div className="space-y-0.5">
              <FavoritedPagesList favPageIds={favPageIds ?? []} favSpaces={favSpaces ?? []} />
            </div>
          );
        })()}
      </div>
    </>
  );
};
