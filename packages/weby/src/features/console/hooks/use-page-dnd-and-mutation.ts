import { useCallback } from "react";

export interface PageTreeItem {
  id: string;
  parentPageId: string | null;
  slugId: string;
  title: string;
  icon?: string;
  spaceId: string;
}

export interface TreeNode {
  children: TreeNode[];
  item: PageTreeItem;
}

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

interface UsePageDnDAndMutationProps {
  node: TreeNode;
  treeItems: PageTreeItem[];
  spaceSlug: string;
  selectedPageId: string | null;
  deletePage: { mutate: (id: string, options?: { onSuccess?: () => void }) => void };
  movePage: { mutate: (params: { id: string; input: { parentPageId: string | null } }) => void };
  navigate: (params: { to: string; params?: Record<string, string> }) => void;
  setShowDeleteConfirm: (show: boolean) => void;
  setMenuOpen?: (open: boolean) => void;
  setContextMenu?: (menu: null) => void;
  hasChildren: boolean;
}

export const usePageDnDAndMutation = ({
  node,
  treeItems,
  spaceSlug,
  selectedPageId,
  deletePage,
  movePage,
  navigate,
  setShowDeleteConfirm,
  setMenuOpen,
  setContextMenu,
  hasChildren,
}: UsePageDnDAndMutationProps) => {
  const submitDelete = useCallback(() => {
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
    setMenuOpen?.(false);
    setContextMenu?.(null);
    setShowDeleteConfirm(false);
  }, [
    node.item.id,
    selectedPageId,
    treeItems,
    deletePage,
    spaceSlug,
    navigate,
    setMenuOpen,
    setContextMenu,
    setShowDeleteConfirm,
  ]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", node.item.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [node.item.id],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (hasChildren) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }
    },
    [hasChildren],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData("text/plain");
      if (
        draggedId &&
        draggedId !== node.item.id &&
        !isDescendant(treeItems, draggedId, node.item.id)
      ) {
        const draggedPage = treeItems.find((item) => item.id === draggedId);
        if (!draggedPage || draggedPage.spaceId !== node.item.spaceId) {
          return;
        }
        movePage.mutate({ id: draggedId, input: { parentPageId: node.item.id } });
      }
    },
    [node.item.id, node.item.spaceId, treeItems, movePage],
  );

  return {
    handleDragOver,
    handleDragStart,
    handleDrop,
    submitDelete,
  };
};
