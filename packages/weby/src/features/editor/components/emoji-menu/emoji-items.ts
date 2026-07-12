import type { CommandProps, EmojiMenuItemType } from "./types";
import { buildEmojiIndex, getFrequentlyUsedEmoji, sortFrequentlyUsedEmoji } from "./utils";

const MAX_RESULTS = 5;

const searchEmoji = async (query: string): Promise<EmojiMenuItemType[]> => {
  if (query === "") {
    return sortFrequentlyUsedEmoji(getFrequentlyUsedEmoji());
  }

  const q = query.toLowerCase();
  const index = await buildEmojiIndex();

  return index
    .filter((e) => e.name.includes(q) || e.id.includes(q))
    .slice(0, MAX_RESULTS)
    .map((entry) => ({
      command: ({ editor, range }: CommandProps) => {
        editor.chain().focus().deleteRange(range).insertContent(`${entry.native} `).run();
      },
      emoji: entry.native,
      id: entry.id,
    }));
};

export const getEmojiItems = ({ query }: { query: string }): Promise<EmojiMenuItemType[]> =>
  searchEmoji(query);

export default getEmojiItems;
