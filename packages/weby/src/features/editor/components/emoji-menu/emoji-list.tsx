import { Loader, Paper, ScrollArea, Text, UnstyledButton } from "@mantine/core";
import { clsx } from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EmojiMenuItemType } from "./types";
import { getEmojiCategories, incrementEmojiUsage } from "./utils";
import type { EmojiCategory, EmojiIndexEntry } from "./utils";
import classes from "./emoji-menu.module.css";
import type { Editor, Range } from "@tiptap/core";

const COLS = 8;

const CAT_ICONS: Record<string, string> = {
  activity: "🎮",
  flags: "🚩",
  foods: "🍕",
  nature: "🌿",
  objects: "🔧",
  people: "😀",
  places: "🗺️",
  symbols: "💯",
};

export const EmojiList = ({
  items,
  isLoading,
  command,
  editor,
  range,
  query = "",
}: {
  items: EmojiMenuItemType[];
  isLoading: boolean;
  command: (item: EmojiMenuItemType) => void;
  editor: Editor;
  range: Range;
  query?: string;
}) => {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const [cats, setCats] = useState<EmojiCategory[]>([]);
  const [activeCat, setActiveCat] = useState("");
  const [focusZone, setFocusZone] = useState<"grid" | "tabs">("grid");
  const [announce, setAnnounce] = useState("");
  const listViewport = useRef<HTMLDivElement>(null);
  const gridViewport = useRef<HTMLDivElement>(null);
  const catBar = useRef<HTMLDivElement>(null);
  const userInteractedRef = useRef(false);

  const searching = query.length > 0;
  const browseLoading = !searching && cats.length === 0;

  const gridItems = useMemo(
    () => cats.find((c) => c.id === activeCat)?.emojis ?? [],
    [cats, activeCat],
  );

  useEffect(() => {
    let active = true;
    const fetchCats = async () => {
      try {
        const data = await getEmojiCategories();
        if (active) {
          setCats(data);
          setActiveCat((prev) => prev || data[0]?.id || "");
        }
      } catch (error) {
        console.error("Failed to load emoji categories", error);
      }
    };
    void fetchCats();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setIdx(0);
  }, [query, activeCat]);

  useEffect(() => {
    if (searching) {
      setFocusZone("grid");
    }
  }, [searching]);

  useEffect(() => {
    if (focusZone !== "tabs") {
      return;
    }
    catBar.current
      ?.querySelector<HTMLElement>(`[data-cat="${activeCat}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeCat, focusZone]);

  useEffect(() => {
    if (focusZone === "tabs") {
      return;
    }
    const vp = searching ? listViewport.current : gridViewport.current;
    vp?.querySelector<HTMLElement>(`[data-i="${idx}"]`)?.scrollIntoView({ block: "nearest" });
  }, [idx, searching, focusZone]);

  // Announce picker open and selection changes via a live region. Focus
  // stays in the editor, so without this the screen reader has no way to
  // know the picker exists or that arrow keys are changing the selection.
  // The setTimeout defers the open message past the initial render so the
  // live region is in the DOM before its content changes (screen readers
  // ignore content that's present at mount time).
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnnounce(t("Emoji picker open. Use arrow keys to navigate, Enter to select."));
    }, 100);
    return () => clearTimeout(timer);
  }, [t]);

  useEffect(() => {
    // Skip data-driven updates (idx reset, async cat load); only announce
    // selection changes that come from real user navigation.
    if (!userInteractedRef.current) {
      return;
    }

    if (focusZone === "tabs") {
      if (activeCat) {
        setAnnounce(t("{{name}} category", { name: activeCat }));
      }
      return;
    }
    if (searching) {
      const item = items[idx];
      if (item) {
        setAnnounce(
          t("{{name}}, {{n}} of {{total}}", {
            n: idx + 1,
            name: item.id,
            total: items.length,
          }),
        );
      }
      return;
    }
    const entry = gridItems[idx];
    if (entry) {
      setAnnounce(
        t("{{name}}, {{n}} of {{total}}", {
          n: idx + 1,
          name: entry.id,
          total: gridItems.length,
        }),
      );
    }
  }, [idx, activeCat, focusZone, searching, items, gridItems, t]);

  const pickSearchItem = useCallback(
    (i: number) => {
      const item = items[i];
      if (!item) {
        return;
      }
      command(item);
      incrementEmojiUsage(item.id);
    },
    [command, items],
  );

  const pickGridItem = useCallback(
    (entry: EmojiIndexEntry) => {
      editor.chain().focus().deleteRange(range).insertContent(`${entry.native} `).run();
      incrementEmojiUsage(entry.id);
    },
    [editor, range],
  );

  useEffect(() => {
    const handleSearchKey = (key: string) => {
      if (key === "ArrowDown") {
        setIdx((i) => Math.min(i + 1, items.length - 1));
      } else if (key === "ArrowUp") {
        setIdx((i) => Math.max(i - 0, 0));
      } else if (key === "Enter") {
        pickSearchItem(idx);
      }
    };

    const handleTabsKey = (key: string) => {
      const catIdx = cats.findIndex((c) => c.id === activeCat);
      if (key === "ArrowRight") {
        const next = cats[Math.min(catIdx + 1, cats.length - 1)];
        if (next) {
          setActiveCat(next.id);
        }
      } else if (key === "ArrowLeft") {
        const prev = cats[Math.max(catIdx - 1, 0)];
        if (prev) {
          setActiveCat(prev.id);
        }
      } else if (key === "ArrowDown" || key === "Enter") {
        setFocusZone("grid");
      }
    };

    const handleGridKey = (key: string) => {
      const total = gridItems.length;
      if (key === "ArrowRight") {
        setIdx((i) => Math.min(i + 1, total - 1));
      } else if (key === "ArrowLeft") {
        setIdx((i) => Math.max(i - 1, 0));
      } else if (key === "ArrowDown") {
        setIdx((i) => Math.min(i + COLS, total - 1));
      } else if (key === "ArrowUp") {
        if (idx < COLS) {
          setFocusZone("tabs");
        } else {
          setIdx((i) => Math.max(i - COLS, 0));
        }
      } else if (key === "Enter" && gridItems[idx]) {
        pickGridItem(gridItems[idx]);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) {
        e.preventDefault();
        userInteractedRef.current = true;
        if (searching) {
          handleSearchKey(e.key);
        } else if (focusZone === "tabs") {
          handleTabsKey(e.key);
        } else {
          handleGridKey(e.key);
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searching, items, idx, gridItems, pickSearchItem, pickGridItem, focusZone, cats, activeCat]);

  const renderContent = () => {
    if (searching) {
      return (
        <>
          {isLoading && <Loader m="xs" size="xs" color="blue" type="dots" />}
          <ScrollArea.Autosize mah={260} scrollbarSize={6} viewportRef={listViewport}>
            <div style={{ padding: 4 }}>
              {items.length === 0 && !isLoading ? (
                <Text size="sm" c="dimmed" p="xs">
                  {t("No results")}
                </Text>
              ) : (
                items.map((item, i) => (
                  <UnstyledButton
                    key={item.id}
                    data-i={i}
                    w="100%"
                    className={clsx(classes.row, { [classes.active]: i === idx })}
                    onClick={() => pickSearchItem(i)}
                    onMouseEnter={() => setIdx(i)}
                    role="option"
                    aria-selected={i === idx}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1, minWidth: 22 }}>{item.emoji}</span>
                    <Text size="sm" c="dimmed" ff="monospace" span>
                      :{item.id}:
                    </Text>
                  </UnstyledButton>
                ))
              )}
            </div>
          </ScrollArea.Autosize>
        </>
      );
    }

    if (browseLoading) {
      return <Loader m="xs" size="xs" color="blue" type="dots" />;
    }

    return (
      <>
        <div className={classes.catBar} role="tablist" ref={catBar}>
          {cats.map((c) => {
            const isActive = c.id === activeCat;
            const isFocused = isActive && focusZone === "tabs";
            return (
              <button
                key={c.id}
                data-cat={c.id}
                title={c.id}
                role="tab"
                aria-selected={isActive}
                aria-label={t("{{name}} category", { name: c.id })}
                className={clsx(classes.catTab, {
                  [classes.catTabActive]: isActive,
                  [classes.catTabFocused]: isFocused,
                })}
                onClick={() => {
                  setActiveCat(c.id);
                  setFocusZone("grid");
                }}
                onMouseEnter={() => setFocusZone("grid")}
              >
                {CAT_ICONS[c.id] ?? "🔣"}
              </button>
            );
          })}
        </div>
        <ScrollArea.Autosize mah={220} scrollbarSize={6} viewportRef={gridViewport}>
          <div className={classes.grid} style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
            {gridItems.map((entry, i) => (
              <button
                key={entry.id}
                data-i={i}
                title={`:${entry.id}:`}
                role="option"
                aria-selected={i === idx}
                aria-label={entry.id}
                className={clsx(classes.emojiBtn, { [classes.active]: i === idx })}
                onClick={() => pickGridItem(entry)}
                onMouseEnter={() => setIdx(i)}
              >
                {entry.native}
              </button>
            ))}
          </div>
        </ScrollArea.Autosize>
      </>
    );
  };

  return (
    <Paper
      id="emoji-command"
      p={0}
      shadow="md"
      withBorder
      radius="none"
      style={{ width: 240 }}
      role="listbox"
      aria-label={t("Emoji picker")}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          border: 0,
          clip: "rect(0,0,0,0)",
          height: 1,
          margin: -1,
          overflow: "hidden",
          padding: 0,
          position: "absolute",
          whiteSpace: "nowrap",
          width: 1,
        }}
      >
        {announce}
      </div>
      {renderContent()}
    </Paper>
  );
};

export default EmojiList;
