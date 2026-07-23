// eslint-disable-next-line import/no-named-as-default
import StarterKit from "@tiptap/starter-kit";
import { CustomCodeBlock } from "./custom-code-block";
import { createLowlight, common } from "lowlight";
import { Link } from "@tiptap/extension-link";
import { PageBreak } from "./page-break";
import { Details, DetailsSummary, DetailsContent } from "./details";
import { Callout } from "./callout";
import { Status } from "./status";
import { Columns, Column } from "./columns";
import {
  CustomTable as Table,
  TableRow,
  TableCell,
  TableHeader,
  TableDndExtension,
  TableHandleCommandsExtension,
  TableHeaderPin,
  TableReadonlySort,
  TableView,
} from "./table";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import { Placeholder } from "@tiptap/extension-placeholder";
import { HeadingWithIds } from "#/features/blog/components/tiptap-heading-ids";
import type { CollaboratorAwarenessUser } from "../lib/collaboration-presence";
import GlobalDragHandle from "./drag-handle";
import SlashCommand from "./slash-command";
import { EmojiCommand } from "./emoji-command";
import { CustomImage } from "./image";
import { CustomVideo } from "./video";
import { CustomAudio } from "./audio";
import { CustomPdf } from "./pdf";
import { MathInline, MathBlock } from "./math";
import { CustomAttachment } from "./attachment";
import { CustomYoutube } from "./youtube";

import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import type { WebsocketProvider } from "y-websocket";

import plaintext from "highlight.js/lib/languages/plaintext";

const lowlight = createLowlight(common);
lowlight.register("mermaid", plaintext);

export const getEditorExtensions = () => [
  CustomImage,
  CustomVideo,
  CustomAudio,
  CustomPdf,
  MathInline,
  MathBlock,
  CustomAttachment,
  CustomYoutube,
  StarterKit.configure({
    codeBlock: false,
    dropcursor: {
      color: "var(--color-text)",
      width: 2,
    },
    heading: false,
    link: false,
    undoRedo: false,
  }),
  HeadingWithIds.configure({
    levels: [1, 2, 3],
  }),
  Link.configure({
    HTMLAttributes: {
      rel: "noopener noreferrer",
      target: "_blank",
    },
    openOnClick: false,
  }),
  CustomCodeBlock.configure({
    defaultLanguage: "plaintext",
    lowlight,
  }),
  Table.configure({
    View: TableView,
    allowTableNodeSelection: true,
    resizable: true,
  }),
  TableRow,
  TableCell,
  TableHeader,
  TableDndExtension,
  TableHandleCommandsExtension,
  TableHeaderPin,
  TableReadonlySort,
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Highlight,
  Superscript,
  Subscript,
  Placeholder.configure({
    placeholder: ({ editor, node, pos }) => {
      if (node.type.name === "heading") {
        return `Heading ${node.attrs.level}`;
      }
      if (node.type.name === "detailsSummary") {
        return "Toggle title";
      }
      if (node.type.name === "paragraph") {
        const $pos = editor.state.doc.resolve(pos);
        const parentName = $pos.parent.type.name;
        if (
          parentName === "column" ||
          parentName === "tableCell" ||
          parentName === "tableHeader" ||
          parentName === "callout" ||
          parentName === "blockquote"
        ) {
          return "Write...";
        }
        return 'Write anything. Enter "/" for commands';
      }
      return "";
    },
  }),
  GlobalDragHandle.configure({
    atomNodes: ["base"] as string[],
    customNodes: ["transclusionSource", "transclusionReference"] as string[],
  }),
  SlashCommand,
  EmojiCommand,
  PageBreak,
  Details,
  DetailsSummary,
  DetailsContent,
  Callout,
  Status,
  Columns,
  Column,
];

const userColors = [
  "#f783ac",
  "#af52de",
  "#7000ff",
  "#4078f2",
  "#0184bc",
  "#50a14f",
  "#a05a00",
  "#c18401",
  "#e45649",
];

export const getCompactCollaboratorName = (name?: string) => {
  if (!name) {
    return "Anonymous";
  }
  const withoutGuestSuffix = name.replace(/\s*\(guest\)$/i, "").trim();
  const firstName = withoutGuestSuffix.split(/\s+/)[0] || withoutGuestSuffix;
  return firstName.length > 14 ? `${firstName.slice(0, 13)}…` : firstName;
};

export const getRandomColor = (name?: string) => {
  if (!name) {
    return userColors[0];
  }
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    const code = name.codePointAt(i) || 0;
    hash = (code + hash * 31) % userColors.length;
  }
  const index = Math.abs(hash) % userColors.length;
  return userColors[index];
};

export const getCollabEditorExtensions = (
  provider: WebsocketProvider,
  user?: CollaboratorAwarenessUser,
) => [
  ...getEditorExtensions(),
  Collaboration.configure({
    document: provider.doc,
  }),
  CollaborationCaret.configure({
    provider,
    render: (presenceUser) => {
      const cursor = document.createElement("span");
      cursor.classList.add("collaboration-carets__caret");
      const userColor = presenceUser?.color || "#3b82f6";
      cursor.style.borderLeftColor = userColor;
      cursor.style.borderColor = userColor;

      const label = document.createElement("div");
      label.classList.add("collaboration-carets__label");
      label.style.backgroundColor = userColor;
      label.textContent = getCompactCollaboratorName(presenceUser?.name);
      cursor.append(label);

      return cursor;
    },
    user: {
      avatar_url: user?.avatar_url,
      color: user?.color || getRandomColor(user?.name || user?.id),
      id: user?.id,
      isGuest: user?.isGuest,
      isOwner: user?.isOwner,
      name: user?.name || "Anonymous",
    },
  }),
];
