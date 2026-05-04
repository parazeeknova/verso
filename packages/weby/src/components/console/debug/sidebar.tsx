import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react";
import {
  useBatchedCallback,
  useDebouncedCallback,
  useQueuer,
  useThrottledCallback,
} from "@tanstack/react-pacer";
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "#/hooks/use-theme";
import { useDebugTables } from "#/hooks/use-console-mutations";
import { fetchProtected } from "#/hooks/fetch-protected";

interface DebugSidebarProps {
  onBack: () => void;
  selectedTable: string | null;
  onSelectTable: (table: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const DebugSidebar = ({
  onBack,
  selectedTable,
  onSelectTable,
  searchQuery,
  onSearchChange,
}: DebugSidebarProps) => {
  const { isDarkMode } = useTheme();
  const { data: tables, refetch } = useDebugTables();
  const queryClient = useQueryClient();
  const t = (dark: string, light: string) => (isDarkMode ? dark : light);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [inputValue, setInputValue] = useState(searchQuery);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useDebouncedCallback((value: string) => onSearchChange(value), {
    wait: 200,
  });

  const throttledRefresh = useThrottledCallback(() => refetch(), { wait: 2000 });

  // Batching: collect rapid table selections and only navigate to the last one
  const batchedSelect = useBatchedCallback(
    (tablesBatch: string[]) => {
      const last = tablesBatch.at(-1);
      if (last) {
        onSelectTable(last);
      }
    },
    { maxSize: 10, wait: 100 },
  );

  // Queuing: process table deletions one by one with a small delay
  const deleteQueue = useQueuer(
    async (table: string) => {
      await fetchProtected(`/api/console/debug/tables/${table}`, { method: "DELETE" });
    },
    { wait: 150 },
    (state) => ({ size: state.size }),
  );

  const handleDeleteAll = () => {
    if (!confirmDeleteAll) {
      setConfirmDeleteAll(true);
      confirmTimer.current = setTimeout(() => setConfirmDeleteAll(false), 3000);
      return;
    }
    if (confirmTimer.current) {
      clearTimeout(confirmTimer.current);
    }
    setConfirmDeleteAll(false);

    for (const table of tables ?? []) {
      deleteQueue.addItem(table);
    }

    // Wait for queue to drain then cleanup
    const checkDrain = setInterval(() => {
      if (deleteQueue.state.size === 0) {
        clearInterval(checkDrain);
        queryClient.invalidateQueries({ queryKey: ["debugTableData"] });
        refetch();
        queryClient.clear();
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("/");
      }
    }, 200);
  };

  const handleSearchChange = (value: string) => {
    setInputValue(value);
    debouncedSearch(value);
  };

  const tableList = tables ?? [];
  const filteredTables = tableList.filter((table) =>
    table.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const deleteBtnClass = confirmDeleteAll
    ? t(
        "border-red-500/50 text-red-400 hover:bg-red-500/10",
        "border-red-500/50 text-red-600 hover:bg-red-500/10",
      )
    : t(
        "border-border-dark text-red-400/50 hover:text-red-400 hover:border-red-500/30",
        "border-border-light text-red-500/50 hover:text-red-600 hover:border-red-500/30",
      );

  return (
    <div className="flex flex-col h-full">
      <div
        className={`flex items-center justify-between px-1 py-2 border-b ${t("border-border-dark", "border-border-light")}`}
      >
        <button
          onClick={onBack}
          className={`flex items-center gap-1.5 text-[11px] lowercase ${t("text-text-dark/70 hover:text-text-dark/90", "text-text-light/70 hover:text-text-light/90")}`}
          type="button"
        >
          <ArrowLeftIcon size={12} />
          back
        </button>
        <span className={`text-[11px] lowercase ${t("text-text-dark/40", "text-text-light/40")}`}>
          debug
        </span>
      </div>

      <div
        className={`px-1 py-2 space-y-2 border-b ${t("border-border-dark", "border-border-light")}`}
      >
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className={t("text-text-dark/20", "text-text-light/20")} size={12} />
          <input
            aria-label="Search tables"
            className={`w-full bg-transparent py-1 text-[11px] lowercase outline-none ${t("placeholder:text-text-dark/20 text-text-dark/60", "placeholder:text-text-light/20 text-text-light/60")}`}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="search tables"
            value={inputValue}
          />
        </div>

        <div className="flex gap-2">
          <button
            className={`flex items-center gap-1 px-2 py-1 text-[10px] lowercase border ${t("text-text-dark/50 hover:text-text-dark/80 border-border-dark", "text-text-light/50 hover:text-text-light/80 border-border-light")}`}
            onClick={() => throttledRefresh()}
            type="button"
          >
            <ArrowClockwiseIcon size={10} />
            refresh
          </button>
          <button
            className={`flex items-center gap-1 px-2 py-1 text-[10px] lowercase border ${deleteBtnClass}`}
            onClick={handleDeleteAll}
            type="button"
          >
            <TrashIcon size={10} />
            {confirmDeleteAll ? "confirm ?" : "delete all"}
          </button>
        </div>
        {deleteQueue.state.size > 0 && (
          <p className={`text-[10px] ${t("text-text-dark/40", "text-text-light/40")}`}>
            deleting {deleteQueue.state.size} tables...
          </p>
        )}
      </div>

      <div className="flex-1 py-2 overflow-y-auto custom-scrollbar">
        {filteredTables.length === 0 ? (
          <p
            className={`px-2 py-4 text-[10px] text-center ${t("text-text-dark/20", "text-text-light/20")}`}
          >
            {tableList.length === 0 ? "loading..." : "no tables match"}
          </p>
        ) : (
          filteredTables.map((table) => (
            <button
              key={table}
              onClick={() => batchedSelect(table)}
              className={`w-full text-left px-2 py-1.5 text-[11px] lowercase ${
                selectedTable === table
                  ? t("bg-white/5 text-text-dark/90", "bg-black/3 text-text-light/90")
                  : t(
                      "text-text-dark/50 hover:text-text-dark/80 hover:bg-white/3",
                      "text-text-light/50 hover:text-text-light/80 hover:bg-black/3",
                    )
              }`}
              type="button"
            >
              {table}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
