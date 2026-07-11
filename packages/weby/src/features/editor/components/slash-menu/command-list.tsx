import { useImperativeHandle, useState, useEffect, useRef } from "react";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { SlashMenuItemType } from "./types";

export type CommandListProps = SuggestionProps<SlashMenuItemType>;

export interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const CommandList = ({
  items,
  command,
  ref,
}: CommandListProps & { ref?: React.Ref<CommandListRef> }) => {
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
      if (items.length === 0) {
        return false;
      }
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
      className="w-55 max-h-60 overflow-y-auto border rounded-none shadow-lg p-0 text-left flex flex-col gap-0 z-100 theme-bg"
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
                ? "bg-neutral-200 dark:bg-neutral-800"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-800/50"
            }`}
          >
            <div className="flex items-center justify-center w-6 h-6 border border-neutral-300 dark:border-neutral-700 bg-neutral-200/50 dark:bg-neutral-800 rounded-none shrink-0">
              <Icon
                size={12}
                className={
                  isActive
                    ? "text-neutral-800 dark:text-neutral-200"
                    : "text-neutral-500 dark:text-neutral-400"
                }
              />
            </div>
            <div className="flex-1 flex flex-col min-w-0">
              <span
                className={`font-semibold text-xs leading-tight ${
                  isActive
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                {item.title}
              </span>
              <span
                className={`text-[10px] truncate leading-none mt-0.5 ${
                  isActive
                    ? "text-neutral-700 dark:text-neutral-300"
                    : "text-neutral-400 dark:text-neutral-500"
                }`}
              >
                {item.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

CommandList.displayName = "CommandList";
