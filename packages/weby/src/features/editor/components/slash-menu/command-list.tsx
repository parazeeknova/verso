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
        className="w-[220px] max-h-[240px] overflow-y-auto border rounded-none shadow-lg p-0 text-left flex flex-col gap-0 z-100 theme-bg"
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
              className={`w-full flex items-center gap-2 px-2 py-1 text-left rounded-none transition-colors ${
                isActive
                  ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              <div className="flex items-center justify-center w-5 h-5 shrink-0">
                <Icon size={13} className="text-neutral-600 dark:text-neutral-300" />
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs leading-tight">
                  {item.title}
                </span>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate leading-none mt-0.5">
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
