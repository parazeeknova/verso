import {
  TextT,
  CheckSquare,
  TextHOne,
  TextHTwo,
  TextHThree,
  ListBullets,
  ListNumbers,
  Quotes,
  Code,
  Minus,
  Table,
} from "@phosphor-icons/react";
import type { SlashMenuItemType } from "./types";

export const getSuggestionItems = (): SlashMenuItemType[] => [
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
    },
    description: "Just start typing with plain text.",
    icon: TextT,
    searchTerms: ["p", "paragraph", "text"],
    title: "Text",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
    description: "Track tasks with a to-do list.",
    icon: CheckSquare,
    searchTerms: ["todo", "task", "list", "check", "checkbox"],
    title: "To-do list",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
    description: "Big section heading.",
    icon: TextHOne,
    searchTerms: ["title", "big", "large", "h1"],
    title: "Heading 1",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
    description: "Medium section heading.",
    icon: TextHTwo,
    searchTerms: ["subtitle", "medium", "h2"],
    title: "Heading 2",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
    description: "Small section heading.",
    icon: TextHThree,
    searchTerms: ["subtitle", "small", "h3"],
    title: "Heading 3",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
    description: "Create a simple bullet list.",
    icon: ListBullets,
    searchTerms: ["unordered", "point", "list", "bullet"],
    title: "Bullet list",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
    description: "Create a list with numbering.",
    icon: ListNumbers,
    searchTerms: ["numbered", "ordered", "list", "ol"],
    title: "Numbered list",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
    description: "Create block quote.",
    icon: Quotes,
    searchTerms: ["blockquote", "quotes", "quote"],
    title: "Quote",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
    description: "Insert code snippet.",
    icon: Code,
    searchTerms: ["codeblock", "code"],
    title: "Code",
  },
  {
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ cols: 3, rows: 3, withHeaderRow: true })
        .run();
    },
    description: "Insert a table.",
    icon: Table,
    searchTerms: ["table", "rows", "columns"],
    title: "Table",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
    description: "Insert horizontal rule divider.",
    icon: Minus,
    searchTerms: ["horizontal rule", "hr", "divider", "line"],
    title: "Divider",
  },
];
