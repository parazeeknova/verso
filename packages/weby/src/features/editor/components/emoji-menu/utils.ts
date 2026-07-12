import type { CommandProps, EmojiMartFrequentlyType, EmojiMenuItemType } from "./types";

export const LOCAL_STORAGE_FREQUENT_KEY = "emoji-mart.frequently";

export const DEFAULT_FREQUENTLY_USED_EMOJI_MART = `{
    "+1": 10,
    "grinning": 9,
    "kissing_heart": 8,
    "heart_eyes": 7,
    "laughing": 6,
    "stuck_out_tongue_winking_eye": 5,
    "sweat_smile": 4,
    "joy": 3,
    "scream": 2,
    "rocket": 1
}`;

export interface EmojiIndexEntry {
  id: string;
  name: string;
  native: string;
}

let _emojiIndex: EmojiIndexEntry[] | null = null;

export const buildEmojiIndex = async (): Promise<EmojiIndexEntry[]> => {
  if (_emojiIndex) {
    return _emojiIndex;
  }
  const { default: data } = await import("@slidoapp/emoji-mart-data");
  const { emojis } = data as {
    emojis: Record<string, { id: string; name: string; skins: { native: string }[] }>;
  };
  _emojiIndex = Object.values(emojis)
    .filter((e) => e.id && e.name && e.skins?.[0]?.native)
    .map((e) => ({
      id: e.id,
      name: e.name.toLowerCase(),
      native: e.skins[0].native,
    }));
  return _emojiIndex;
};

export const incrementEmojiUsage = (emojiId: string) => {
  const stored = JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_FREQUENT_KEY) || DEFAULT_FREQUENTLY_USED_EMOJI_MART,
  ) as EmojiMartFrequentlyType;
  stored[emojiId] = (stored[emojiId] ?? 0) + 1;
  localStorage.setItem(LOCAL_STORAGE_FREQUENT_KEY, JSON.stringify(stored));
};

export const sortFrequentlyUsedEmoji = async (
  frequentlyUsedEmoji: EmojiMartFrequentlyType,
): Promise<EmojiMenuItemType[]> => {
  const index = await buildEmojiIndex();
  const results: EmojiMenuItemType[] = Object.entries(frequentlyUsedEmoji)
    .map(([id, count]): EmojiMenuItemType | null => {
      const entry = index.find((e) => e.id === id);
      if (!entry) {
        return null;
      }
      return {
        command: ({ editor, range }: CommandProps) => {
          editor.chain().focus().deleteRange(range).insertContent(`${entry.native} `).run();
        },
        count,
        emoji: entry.native,
        id,
      };
    })
    .filter((e): e is EmojiMenuItemType => e !== null);
  return results.toSorted((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 5);
};

export const getFrequentlyUsedEmoji = (): EmojiMartFrequentlyType =>
  JSON.parse(
    localStorage.getItem(LOCAL_STORAGE_FREQUENT_KEY) || DEFAULT_FREQUENTLY_USED_EMOJI_MART,
  ) as EmojiMartFrequentlyType;

export interface EmojiCategory {
  id: string;
  emojis: EmojiIndexEntry[];
}

let _cats: EmojiCategory[] | null = null;

export const getEmojiCategories = async (): Promise<EmojiCategory[]> => {
  if (_cats) {
    return _cats;
  }
  const [{ default: data }, index] = await Promise.all([
    import("@slidoapp/emoji-mart-data"),
    buildEmojiIndex(),
  ]);
  const byId = new Map(index.map((e) => [e.id, e]));
  const { categories } = data as { categories: { id: string; emojis: string[] }[] };
  _cats = categories
    .map((cat) => ({
      emojis: cat.emojis.map((id) => byId.get(id)).filter((e): e is EmojiIndexEntry => !!e),
      id: cat.id,
    }))
    .filter((c) => c.emojis.length > 0);
  return _cats;
};
