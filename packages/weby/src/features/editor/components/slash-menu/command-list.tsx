import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from "react";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { SlashMenuItemType } from "./types";

export type CommandListProps = SuggestionProps<SlashMenuItemType>;

export interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const CommandList = forwardRef<CommandListRef, CommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    useEffect(() => {
      const activeEl = containerRef.current?.querySelector(`[data-active="true"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }, [selectedIndex]);

    if (items.length === 0) {
      return null;
    }

    return (
      <div
        ref={containerRef}
        className="w-70 max-h-82.5 overflow-y-auto border rounded-lg shadow-xl p-1 text-left flex flex-col gap-0.5 z-100 theme-bg"
        style={{
          backgroundColor: "var(--color-bg)",
          borderColor: "var(--color-border)",
        }}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === selectedIndex;
          return (
            <button
              key={item.title}
              type="button"
              data-active={isActive ? "true" : "false"}
              onClick={() => selectItem(index)}
              className={`w-full flex items-center gap-3 px-3 py-1.5 text-left rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded bg-neutral-200/50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700">
                <Icon size={16} className="text-neutral-600 dark:text-neutral-300" />
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <span className="font-medium text-neutral-800 dark:text-neutral-200 leading-none mb-0.5">
                  {item.title}
                </span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                  {item.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  },
);

CommandList.displayName = "CommandList";
