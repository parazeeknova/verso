import { useEffect, useMemo, useRef, useState } from "react";
import { CaretUpDownIcon, MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { useTheme } from "#/shared/hooks/use-theme";
import { useCreateSpace, useSpaces } from "#/features/console/hooks/use-spaces";
import { useWorkspaces } from "#/features/console/hooks/use-workspaces";
import type { Space } from "#/shared/types";
import { SpaceDetailSidebar } from "./space-detail-sidebar";

const columnHelper = createColumnHelper<Space>();

const tc = (isDarkMode: boolean, dark: string, light: string) => (isDarkMode ? dark : light);

interface TableBodyProps {
  columnsLength: number;
  filteredSpaces: Space[];
  isDarkMode: boolean;
  isPending: boolean;
  onRowClick?: (space: Space) => void;
  spacesLength: number;
  tableRows: ReturnType<ReturnType<typeof useReactTable<Space>>["getRowModel"]>["rows"];
}

const TableBody = ({
  columnsLength,
  filteredSpaces,
  isDarkMode,
  isPending,
  onRowClick,
  spacesLength,
  tableRows,
}: TableBodyProps) => {
  if (isPending) {
    return (
      <tr>
        <td
          className={`px-3 py-8 text-center text-[11px] ${tc(isDarkMode, "text-text-dark/30", "text-text-light/30")}`}
          colSpan={columnsLength}
        >
          loading spaces...
        </td>
      </tr>
    );
  }

  if (filteredSpaces.length === 0) {
    return (
      <tr>
        <td
          className={`px-3 py-8 text-center text-[11px] ${tc(isDarkMode, "text-text-dark/30", "text-text-light/30")}`}
          colSpan={columnsLength}
        >
          {spacesLength === 0 ? "no spaces yet" : "no spaces match your search"}
        </td>
      </tr>
    );
  }

  return tableRows.map((row) => (
    <tr
      key={row.id}
      className={`border-b cursor-pointer ${tc(isDarkMode, "border-border-dark/50", "border-border-light/50")} ${tc(isDarkMode, "hover:bg-white/2", "hover:bg-black/2")}`}
      onClick={() => onRowClick?.(row.original)}
    >
      {row.getVisibleCells().map((cell) => (
        <td key={cell.id} className="px-3 py-2">
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  ));
};

const getInitials = (text: string) =>
  text
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const pluralize = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

interface CreateSpaceDropdownProps {
  isDarkMode: boolean;
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
}

const CreateSpaceDropdown = ({
  isDarkMode,
  isOpen,
  workspaceId,
  onClose,
}: CreateSpaceDropdownProps) => {
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const createSpace = useCreateSpace();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setSlug("");
      setDescription("");
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen, onClose]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim()) {
      setSlug(
        value
          .toLowerCase()
          .trim()
          .replaceAll(/[^\w\s-]/g, "")
          .replaceAll(/[\s_-]+/g, "-")
          .replaceAll(/^-+|-+$/g, ""),
      );
    }
  };

  const handleSubmit = () => {
    setError("");
    if (!name.trim()) {
      setError("name is required");
      return;
    }
    if (!slug.trim()) {
      setError("slug is required");
      return;
    }
    createSpace.mutate(
      {
        description: description.trim() || undefined,
        name: name.trim(),
        slug: slug.trim(),
        workspaceId,
      },
      {
        onError: (err: Error) => {
          setError(err.message || "failed to create space");
        },
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className={`absolute right-0 top-full mt-1 w-64 border p-3 shadow-xl z-50 ${t("border-border-dark bg-bg-dark", "border-border-light bg-bg-light")}`}
    >
      {error && (
        <p className={`mb-2 text-[10px] lowercase ${t("text-red-400", "text-red-600")}`}>{error}</p>
      )}

      <div className="space-y-2">
        <input
          className={`w-full bg-transparent border-b py-1.5 text-[11px] lowercase outline-none transition-colors ${t("border-border-dark text-text-dark placeholder:text-text-dark/20 focus:border-text-dark/50", "border-border-light text-text-light placeholder:text-text-light/20 focus:border-text-light/50")}`}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="space name"
          type="text"
          value={name}
        />
        <input
          className={`w-full bg-transparent border-b py-1.5 text-[11px] lowercase outline-none transition-colors ${t("border-border-dark text-text-dark placeholder:text-text-dark/20 focus:border-text-dark/50", "border-border-light text-text-light placeholder:text-text-light/20 focus:border-text-light/50")}`}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="space slug"
          type="text"
          value={slug}
        />
        <input
          className={`w-full bg-transparent border-b py-1.5 text-[11px] lowercase outline-none transition-colors ${t("border-border-dark text-text-dark placeholder:text-text-dark/20 focus:border-text-dark/50", "border-border-light text-text-light placeholder:text-text-light/20 focus:border-text-light/50")}`}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="description"
          type="text"
          value={description}
        />
      </div>

      <div className="flex items-center justify-end gap-2 mt-2">
        <button
          className={`text-[10px] lowercase ${t("text-text-dark/40 hover:text-text-dark/70", "text-text-light/40 hover:text-text-light/70")}`}
          onClick={onClose}
          type="button"
        >
          cancel
        </button>
        <button
          className={`text-[10px] lowercase ${t("text-text-dark/60 hover:text-text-dark/90", "text-text-light/60 hover:text-text-light/90")}`}
          onClick={handleSubmit}
          type="button"
        >
          create
        </button>
      </div>
    </div>
  );
};

interface SpacesSettingsProps {
  urlWorkspaceName?: string;
}

export const SpacesSettings = ({ urlWorkspaceName }: SpacesSettingsProps) => {
  const { isDarkMode } = useTheme();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const { data: workspaces } = useWorkspaces();
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);

  const workspace = useMemo(() => {
    if (!workspaces || !urlWorkspaceName) {
      return;
    }
    return workspaces.find((w) => w.name === urlWorkspaceName || w.slug === urlWorkspaceName);
  }, [workspaces, urlWorkspaceName]);

  const { data: spaces, isPending } = useSpaces(workspace?.id ?? "");

  const filteredSpaces = useMemo(() => {
    const list = (spaces ?? []).filter((s) => s.slug !== "nospace");
    if (!searchQuery) {
      return list;
    }
    const term = searchQuery.toLowerCase();
    return list.filter(
      (s) => s.name.toLowerCase().includes(term) || s.slug.toLowerCase().includes(term),
    );
  }, [spaces, searchQuery]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        cell: (info) => {
          const space = info.row.original;
          const initials = getInitials(space.name);
          return (
            <div className="flex items-center gap-2">
              {space.icon ? (
                <img
                  alt=""
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                  src={space.icon}
                />
              ) : (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-medium shrink-0 bg-white/10 text-text-dark/60">
                  {initials}
                </span>
              )}
              <div className="flex flex-col">
                <span className="text-[11px]">{space.name}</span>
                <span
                  className={`text-[11px] ${tc(isDarkMode, "text-text-dark/30", "text-text-light/30")}`}
                >
                  {space.slug}
                </span>
              </div>
            </div>
          );
        },
        header: "space",
      }),
      columnHelper.display({
        cell: (info) => {
          const space = info.row.original;
          return (
            <span
              className={`text-[11px] ${tc(isDarkMode, "text-text-dark/30", "text-text-light/30")}`}
            >
              {space.memberCount} member{space.memberCount === 1 ? "" : "s"}
            </span>
          );
        },
        header: "members",
        id: "members",
      }),
      columnHelper.display({
        cell: () => (
          <span
            className={`text-[11px] ${tc(isDarkMode, "text-text-dark/30", "text-text-light/30")}`}
          >
            —
          </span>
        ),
        header: "last active",
        id: "lastActive",
      }),
    ],
    [isDarkMode],
  );

  const table = useReactTable({
    columns,
    data: filteredSpaces,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1
        className={`text-center text-sm font-normal lowercase mb-8 ${t("text-text-dark", "text-text-light")}`}
      >
        {workspace ? `${workspace.name} spaces` : "spaces"}
      </h1>

      <div className="flex items-center gap-3 mb-4">
        <MagnifyingGlassIcon className={t("text-text-dark/20", "text-text-light/20")} size={12} />
        <input
          className={`w-[40%] bg-transparent py-1 text-[11px] lowercase outline-none border-b ${t("border-border-dark", "border-border-light")} ${t("placeholder:text-text-dark/20 text-text-dark/60", "placeholder:text-text-light/20 text-text-light/60")}`}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="search spaces"
          type="text"
          value={searchQuery}
        />
        <div className="ml-auto flex items-center gap-2 relative">
          <button
            className={`flex items-center gap-1 text-[10px] lowercase ${t("text-text-dark/40 hover:text-text-dark/70", "text-text-light/40 hover:text-text-light/70")}`}
            onClick={() => setShowCreateModal((v) => !v)}
            type="button"
          >
            <PlusIcon size={11} />
            create space
          </button>
          <CreateSpaceDropdown
            isDarkMode={isDarkMode}
            isOpen={showCreateModal}
            workspaceId={workspace?.id ?? ""}
            onClose={() => setShowCreateModal(false)}
          />
        </div>
      </div>

      <div className={`border ${t("border-border-dark", "border-border-light")} overflow-x-auto`}>
        <table className="w-full text-left">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className={`border-b ${t("border-border-dark", "border-border-light")}`}
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-3 py-2 text-[10px] uppercase tracking-wider ${t("text-text-dark/30", "text-text-light/30")}`}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className="flex items-center gap-1 group"
                        onClick={header.column.getToggleSortingHandler()}
                        type="button"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <CaretUpDownIcon
                            className={`size-2.5 ${
                              header.column.getIsSorted()
                                ? "text-blue-400"
                                : t("text-text-dark/20", "text-text-light/20")
                            }`}
                            weight="bold"
                          />
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            <TableBody
              columnsLength={columns.length}
              filteredSpaces={filteredSpaces}
              isDarkMode={isDarkMode}
              isPending={isPending}
              onRowClick={(space) => setSelectedSpace(space)}
              spacesLength={spaces?.filter((s) => s.slug !== "nospace").length ?? 0}
              tableRows={table.getRowModel().rows}
            />
          </tbody>
        </table>
      </div>

      <div className={`mt-4 text-[10px] lowercase ${t("text-text-dark/20", "text-text-light/20")}`}>
        {pluralize(filteredSpaces.length, "space")}
      </div>

      {selectedSpace && (
        <SpaceDetailSidebar
          isOpen={!!selectedSpace}
          onClose={() => setSelectedSpace(null)}
          space={selectedSpace}
          workspaceName={workspace?.name ?? ""}
        />
      )}
    </div>
  );
};
