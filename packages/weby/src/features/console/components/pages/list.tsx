import type { PageTreeItem } from "#/shared/types";
import { CaretDownIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import { useQueuer } from "@tanstack/react-pacer";
import { useState, useCallback, useEffect } from "react";
import { useTheme } from "#/shared/hooks/use-theme";
import { useCreatePage, useDeletePage, usePageTree } from "#/features/console/hooks/use-pages";
import { useSpaces } from "#/features/console/hooks/use-spaces";
import { useWorkspaces } from "#/features/console/hooks/use-workspaces";

interface PageListProps {
  onSelectPage: (id: string) => void;
  selectedPageId: string | null;
  selectedWorkspaceId: string;
  selectedSpaceId: string;
  onSelectWorkspace: (id: string) => void;
  onSelectSpace: (id: string) => void;
}

interface TreeNodeProps {
  item: PageTreeItem;
  allItems: PageTreeItem[];
  depth: number;
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

const TreeNode = ({
  item,
  allItems,
  depth,
  selectedPageId,
  onSelectPage,
  onDelete,
  onAddChild,
}: TreeNodeProps) => {
  const { isDarkMode } = useTheme();
  const [expanded, setExpanded] = useState(true);
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  const children = allItems.filter((child) => child.parentPageId === item.id);
  const isSelected = selectedPageId === item.id;

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }, []);

  return (
    <li>
      <div
        className={`group flex items-center w-full text-left text-[13px] lowercase transition-colors ${
          isSelected
            ? t("bg-white/10 text-text-dark", "bg-black/10 text-text-light")
            : t(
                "text-text-dark/60 hover:bg-white/5 hover:text-text-dark/80",
                "text-text-light/60 hover:bg-black/5 hover:text-text-light/80",
              )
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          className={`shrink-0 p-0.5 ${children.length === 0 ? "invisible" : ""} ${t(
            "text-text-dark/30 hover:text-text-dark/60",
            "text-text-light/30 hover:text-text-light/60",
          )}`}
          onClick={handleToggleExpand}
          type="button"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <CaretDownIcon size={10} /> : <CaretRightIcon size={10} />}
        </button>
        <button
          aria-current={isSelected ? "page" : undefined}
          className="flex-1 flex items-center gap-1.5 px-1 py-1.5 overflow-hidden"
          onClick={() => onSelectPage(item.id)}
          type="button"
        >
          <span className="shrink-0">{item.icon || "📄"}</span>
          <span className="truncate">{item.title || item.slugId}</span>
          {!item.isPublished && (
            <span
              className={`shrink-0 text-[10px] ${t("text-text-dark/30", "text-text-light/30")}`}
            >
              draft
            </span>
          )}
        </button>
        <div className="hidden group-hover:flex items-center gap-0.5 pr-1">
          <button
            className={`p-0.5 rounded ${t("text-text-dark/30 hover:text-text-dark", "text-text-light/30 hover:text-text-light")}`}
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(item.id);
            }}
            title="Add child page"
            type="button"
          >
            <PlusIcon size={10} />
          </button>
          <button
            className={`p-0.5 rounded ${t("text-text-dark/30 hover:text-red-400", "text-text-light/30 hover:text-red-600")}`}
            onClick={(e) => {
              e.stopPropagation();
              // eslint-disable-next-line no-alert
              if (confirm(`Delete "${item.title}" and its children?`)) {
                onDelete(item.id);
              }
            }}
            title="Delete page"
            type="button"
          >
            <span className="text-[10px]">×</span>
          </button>
        </div>
      </div>
      {expanded && children.length > 0 && (
        <ul className="space-y-0">
          {children.map((child) => (
            <TreeNode
              allItems={allItems}
              depth={depth + 1}
              item={child}
              key={child.id}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onSelectPage={onSelectPage}
              selectedPageId={selectedPageId}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const PageList = ({
  onSelectPage,
  selectedPageId,
  selectedWorkspaceId,
  selectedSpaceId,
  onSelectWorkspace,
  onSelectSpace,
}: PageListProps) => {
  const { data: treeItems, isPending, isError } = usePageTree(selectedSpaceId);
  const { data: workspaces } = useWorkspaces();
  const { data: spaces } = useSpaces(selectedWorkspaceId);
  const createPage = useCreatePage();
  const deletePage = useDeletePage();
  const { isDarkMode } = useTheme();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | undefined>();
  const [newSlugId, setNewSlugId] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const deleteQueue = useQueuer(
    (id: string) => {
      deletePage.mutate(id);
    },
    { wait: 100 },
    (state) => ({ size: state.size }),
  );

  const t = (dark: string, light: string) => (isDarkMode ? dark : light);

  // Auto-select first workspace
  useEffect(() => {
    if (!selectedWorkspaceId && workspaces && workspaces.length > 0) {
      onSelectWorkspace(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId, onSelectWorkspace]);

  // Auto-select first space
  useEffect(() => {
    if (!selectedSpaceId && spaces) {
      const activeSpaces = spaces.filter((s) => s.slug !== "nospace");
      if (activeSpaces.length > 0) {
        onSelectSpace(activeSpaces[0].id);
      }
    }
  }, [spaces, selectedSpaceId, onSelectSpace]);

  const handleCreate = useCallback(() => {
    if (!newSlugId.trim() || !newTitle.trim()) {
      return;
    }
    createPage.mutate(
      {
        parentPageId: createParentId,
        slugId: newSlugId.trim(),
        spaceId: selectedSpaceId || "",
        title: newTitle.trim(),
        workspaceId: selectedWorkspaceId || "",
      },
      {
        onSuccess: (data) => {
          setShowCreateForm(false);
          setNewSlugId("");
          setNewTitle("");
          setCreateParentId(undefined);
          onSelectPage(data.id);
        },
      },
    );
  }, [
    newSlugId,
    newTitle,
    createParentId,
    selectedSpaceId,
    selectedWorkspaceId,
    createPage,
    onSelectPage,
  ]);

  const handleAddChild = useCallback((parentId: string) => {
    setCreateParentId(parentId);
    setNewSlugId("");
    setNewTitle("");
    setShowCreateForm(true);
  }, []);

  const rootItems = treeItems?.filter((item) => item.parentPageId === null) ?? [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {selectedSpaceId ? (
        <>
          {deleteQueue.state.size > 0 && (
            <p className={`text-[10px] mb-1 ${t("text-text-dark/40", "text-text-light/40")}`}>
              {deleteQueue.state.size} delete{deleteQueue.state.size === 1 ? "" : "s"} queued
            </p>
          )}

          {showCreateForm && (
            <div
              className={`mb-3 rounded border p-3 space-y-2 ${t("border-border-dark", "border-border-light")}`}
            >
              <input
                autoFocus
                className={`w-full rounded border px-2 py-1 text-[12px] bg-transparent outline-none ${t(
                  "border-border-dark text-text-dark placeholder-text-dark/30",
                  "border-border-light text-text-light placeholder-text-light/30",
                )}`}
                onChange={(e) => setNewSlugId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreate();
                  }
                  if (e.key === "Escape") {
                    setShowCreateForm(false);
                  }
                }}
                placeholder="slug (e.g. getting-started)"
                value={newSlugId}
              />
              <input
                className={`w-full rounded border px-2 py-1 text-[12px] bg-transparent outline-none ${t(
                  "border-border-dark text-text-dark placeholder-text-dark/30",
                  "border-border-light text-text-light placeholder-text-light/30",
                )}`}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreate();
                  }
                  if (e.key === "Escape") {
                    setShowCreateForm(false);
                  }
                }}
                placeholder="title"
                value={newTitle}
              />
              {createParentId && (
                <p className={`text-[10px] ${t("text-text-dark/30", "text-text-light/30")}`}>
                  will be created as a child page
                </p>
              )}
              <div className="flex gap-2">
                <button
                  className={`text-[11px] rounded px-2 py-1 transition-colors ${t(
                    "bg-white/10 text-text-dark/80 hover:bg-white/20",
                    "bg-black/10 text-text-light/80 hover:bg-black/20",
                  )}`}
                  disabled={createPage.isPending || !newSlugId.trim() || !newTitle.trim()}
                  onClick={handleCreate}
                  type="button"
                >
                  {createPage.isPending ? "creating..." : "create"}
                </button>
                <button
                  className={`text-[11px] rounded px-2 py-1 transition-colors ${t(
                    "text-text-dark/40 hover:text-text-dark",
                    "text-text-light/40 hover:text-text-light",
                  )}`}
                  onClick={() => {
                    setShowCreateForm(false);
                    setCreateParentId(undefined);
                  }}
                  type="button"
                >
                  cancel
                </button>
              </div>
            </div>
          )}

          {(() => {
            if (isPending) {
              return (
                <p
                  className={`flex-1 flex items-center justify-center text-[13px] ${t("text-text-dark/40", "text-text-light/40")}`}
                >
                  loading pages...
                </p>
              );
            }
            if (isError) {
              return (
                <p className="flex-1 flex items-center justify-center text-[13px] text-red-400">
                  failed to load pages
                </p>
              );
            }
            if (!treeItems || treeItems.length === 0) {
              return (
                <p
                  className={`flex-1 flex items-center justify-center text-[13px] ${t("text-text-dark/40", "text-text-light/40")}`}
                >
                  no pages yet
                </p>
              );
            }
            return (
              <ul className="space-y-0 overflow-y-auto flex-1">
                {rootItems.map((item) => (
                  <TreeNode
                    allItems={treeItems}
                    depth={0}
                    item={item}
                    key={item.id}
                    onAddChild={handleAddChild}
                    onDelete={(id) => deleteQueue.addItem(id)}
                    onSelectPage={onSelectPage}
                    selectedPageId={selectedPageId}
                  />
                ))}
              </ul>
            );
          })()}
        </>
      ) : (
        <p
          className={`flex-1 flex items-center justify-center text-[13px] ${t("text-text-dark/40", "text-text-light/40")}`}
        >
          select a space
        </p>
      )}
    </div>
  );
};
