import {
  ArrowLeftIcon,
  BookmarkSimpleIcon,
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
  DotsThreeCircleVerticalIcon,
  FilePlusIcon,
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  GearSixIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  SquaresFourIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { PageTreeItem, Space } from "#/shared/types";
import {
  useCreatePage,
  useDeletePage,
  useMovePage,
  usePageTree,
  useUpdatePage,
} from "#/features/console/hooks/use-pages";
import {
  useIsPageFavorited,
  useTogglePageFavorite,
} from "#/features/console/hooks/use-page-favorites";
import { useTheme } from "#/shared/hooks/use-theme";
import { useConsoleContext } from "#/features/console/components/console-context";

const toSlug = (title: string): string =>
  title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");

const makeSlug = (title: string): string => {
  const base = toSlug(title) || crypto.randomUUID().slice(0, 8);
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
};

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
    const list = byParent.get(item.parentPageId);
    if (list) {
      list.push(item);
    } else {
      byParent.set(item.parentPageId, [item]);
    }
  }
  const build = (parentId: string | null): TreeNode[] => {
    const children = byParent.get(parentId) ?? [];
    return children.map((item) => ({ children: build(item.id), item }));
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

interface ContextMenuState {
  x: number;
  y: number;
  pageId: string;
  title: string;
}

interface PageNodeProps {
  node: TreeNode;
  depth: number;
  spaceId: string;
  spaceSlug: string;
  treeItems: PageTreeItem[];
}

// oxlint-disable-next-line complexity
const PageNode = ({ node, depth, spaceId, spaceSlug, treeItems }: PageNodeProps) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { selectedPageId } = useConsoleContext();
  const [expanded, setExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCreatingChild, setIsCreatingChild] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState("");
  const isSubmittingRef = useRef(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const childInputRef = useRef<HTMLInputElement>(null);

  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const createPage = useCreatePage();
  const movePage = useMovePage();
  const { data: favData } = useIsPageFavorited(node.item.id);
  const toggleFav = useTogglePageFavorite();
  const isFaved = favData?.favorited ?? false;

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const hasChildren = node.children.length > 0 || isCreatingChild || node.item.icon === "folder";
  const isSelected = selectedPageId === node.item.id;

  useEffect(() => {
    if (!contextMenu) {
      return;
    }
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
        setShowDeleteConfirm(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (isCreatingChild && childInputRef.current) {
      childInputRef.current.focus();
    }
  }, [isCreatingChild]);

  const handleDotsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      pageId: node.item.id,
      title: node.item.title,
      x: rect.left + rect.width / 2,
      y: rect.bottom + 4,
    });
  };

  const startRename = () => {
    setRenameTitle(node.item.title);
    setIsRenaming(true);
    setContextMenu(null);
    setShowDeleteConfirm(false);
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
    updatePage.mutate({ id: node.item.id, input: { title: trimmed } });
    setIsRenaming(false);
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 1000);
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
          navigate({
            params: { spaceSlug },
            to: "/s/$spaceSlug",
          });
        }
      },
    });
    setContextMenu(null);
    setShowDeleteConfirm(false);
  };

  const submitCreateChild = () => {
    const trimmed = newChildTitle.trim();
    if (!trimmed) {
      setIsCreatingChild(false);
      return;
    }
    createPage.mutate({
      parentPageId: node.item.id,
      slugId: makeSlug(trimmed),
      spaceId,
      title: trimmed,
    });
    setNewChildTitle("");
    setIsCreatingChild(false);
  };

  const handleChildKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      submitCreateChild();
    } else if (e.key === "Escape") {
      setIsCreatingChild(false);
    }
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
        className={`flex group w-full items-center gap-1 py-0.5 text-[11px] lowercase cursor-default ${t(
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
          setContextMenu(null);
          setShowDeleteConfirm(false);
        }}
        draggable
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        onDrop={handleDrop}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
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
              onPointerDown={(e) => {
                e.preventDefault();
                setIsRenaming(false);
              }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreatingChild(true);
                  setExpanded(true);
                }}
                title="New child page"
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
              {contextMenu && contextMenu.pageId === node.item.id && (
                <div
                  className={`fixed z-50 py-1 w-32 text-[11px] lowercase shadow-lg ${t(
                    "bg-neutral-800 border border-white/10 text-text-dark",
                    "bg-white border border-black/10 text-text-light",
                  )}`}
                  style={{ left: `${contextMenu.x - 64}px`, top: `${contextMenu.y}px` }}
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
              spaceId={spaceId}
              spaceSlug={spaceSlug}
              treeItems={treeItems}
            />
          ))}
          {isCreatingChild && (
            <li>
              <div
                className={`flex items-center gap-1 py-0.5 text-[11px] lowercase ${t("text-text-dark/50", "text-text-light/50")}`}
                style={{ paddingLeft: `${(depth + 1) * 12 + 4}px` }}
              >
                <FileTextIcon className="shrink-0" size={10} />
                <input
                  ref={childInputRef}
                  className="flex-1 bg-transparent outline-none text-[11px] lowercase border-b border-dashed border-text-dark/20"
                  onBlur={submitCreateChild}
                  onChange={(e) => setNewChildTitle(e.target.value)}
                  onKeyDown={handleChildKeyDown}
                  placeholder="new page..."
                  value={newChildTitle}
                />
                <button
                  className="shrink-0 cursor-pointer opacity-60 hover:opacity-100"
                  onClick={submitCreateChild}
                  type="button"
                >
                  <CheckIcon size={10} />
                </button>
                <button
                  className="shrink-0 cursor-pointer opacity-60 hover:opacity-100"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setIsCreatingChild(false);
                  }}
                  type="button"
                >
                  <XIcon size={10} />
                </button>
              </div>
            </li>
          )}
        </ul>
      )}
    </li>
  );
};

interface SpaceSidebarProps {
  space: Space;
}

export const SpaceSidebar = ({ space }: SpaceSidebarProps) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const { location } = routerState;
  const { data: treeItems, isPending } = usePageTree(space.id);
  const isOverview = location.pathname === `/s/${space.slug}`;
  const isSettings = location.pathname.startsWith(`/s/${space.slug}/settings`);

  const createPage = useCreatePage();

  const handleCreate = (kind: "page" | "folder") => {
    const suffix = crypto.randomUUID().slice(0, 8);
    if (kind === "folder") {
      createPage.mutate({
        icon: "folder",
        slugId: `new-folder-${suffix}`,
        spaceId: space.id,
        title: "new folder",
      });
    } else {
      createPage.mutate({
        slugId: `untitled-page-${suffix}`,
        spaceId: space.id,
        title: "untitled page",
      });
    }
  };

  const handleCreatePage = () => handleCreate("page");

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const pageTree = treeItems ? buildPageTree(treeItems) : [];

  return (
    <div className="min-h-0 w-full flex-1 flex flex-col overflow-y-auto px-4">
      <div
        className={`flex items-center justify-between px-1 py-2 border-b ${t("border-border-dark", "border-border-light")}`}
      >
        <button
          className={`flex items-center gap-1.5 text-[11px] lowercase ${t("text-text-dark/70 hover:text-text-dark/90", "text-text-light/70 hover:text-text-light/90")}`}
          onClick={() => navigate({ to: "/home" })}
          type="button"
        >
          <ArrowLeftIcon size={12} />
          back
        </button>
        <div className="flex items-center gap-1 text-[11px] lowercase">
          <span
            className={`truncate max-w-30 uppercase font-bold ${t("text-text-dark/40", "text-text-light/40")}`}
          >
            {space.name}
          </span>{" "}
          -
          <span className={`truncate max-w-20 ${t("text-text-dark/40", "text-text-light/40")}`}>
            {space.description}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <p
          className={`px-1 mb-1 text-[10px] uppercase tracking-wider ${t("text-text-dark/30", "text-text-light/30")}`}
        >
          space
        </p>
        <button
          className={`flex w-full items-center gap-2 px-1 py-1.5 text-left text-[11px] lowercase ${
            isOverview
              ? t("bg-white/10 text-text-dark", "bg-black/10 text-text-light")
              : t(
                  "text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80",
                  "text-text-light/50 hover:bg-black/3 hover:text-text-light/80",
                )
          }`}
          onClick={() => navigate({ to: `/s/${space.slug}` })}
          type="button"
        >
          <SquaresFourIcon size={12} />
          overview
        </button>
        <button
          className={`flex w-full items-center gap-2 px-1 py-1.5 text-left text-[11px] lowercase ${t("text-text-dark/25", "text-text-light/25")} cursor-not-allowed opacity-40`}
          type="button"
        >
          <MagnifyingGlassIcon size={12} />
          search
        </button>
        <button
          className={`flex w-full items-center gap-2 px-1 py-1.5 text-left text-[11px] lowercase ${
            isSettings
              ? t("bg-white/10 text-text-dark", "bg-black/10 text-text-light")
              : t(
                  "text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80",
                  "text-text-light/50 hover:bg-black/3 hover:text-text-light/80",
                )
          }`}
          onClick={() => navigate({ to: `/s/${space.slug}/settings` })}
          type="button"
        >
          <GearSixIcon size={12} />
          space settings
        </button>

        <button
          className={`flex w-full items-center gap-2 px-1 py-1.5 text-left text-[11px] lowercase ${t("text-text-dark/50 hover:bg-white/5 hover:text-text-dark/80", "text-text-light/50 hover:bg-black/3 hover:text-text-light/80")}`}
          onClick={handleCreatePage}
          type="button"
        >
          <PlusIcon size={12} />
          new page
        </button>
      </div>

      <div className="mt-4 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-1 mb-1">
          <p
            className={`text-[10px] uppercase tracking-wider ${t("text-text-dark/30", "text-text-light/30")}`}
          >
            pages
          </p>
          <div className="flex items-center gap-1.5">
            <button
              className={`cursor-pointer ${t("text-text-dark/25 hover:text-text-dark/50", "text-text-light/25 hover:text-text-light/50")}`}
              onClick={handleCreatePage}
              title="New page"
              type="button"
            >
              <FilePlusIcon size={12} />
            </button>
            <button
              className={`cursor-pointer ${t("text-text-dark/25 hover:text-text-dark/50", "text-text-light/25 hover:text-text-light/50")}`}
              onClick={() => handleCreate("folder")}
              title="New folder"
              type="button"
            >
              <FolderPlusIcon size={12} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {(() => {
            if (isPending) {
              return (
                <p className={`px-1 text-[11px] ${t("text-text-dark/25", "text-text-light/25")}`}>
                  loading...
                </p>
              );
            }
            if (pageTree.length === 0) {
              return (
                <p className={`px-1 text-[11px] ${t("text-text-dark/25", "text-text-light/25")}`}>
                  no pages yet
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
                    spaceId={space.id}
                    spaceSlug={space.slug}
                    treeItems={treeItems ?? []}
                  />
                ))}
              </ul>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
