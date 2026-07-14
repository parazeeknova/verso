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
import GlobalDragHandle from "./drag-handle";
import SlashCommand from "./slash-command";
import { EmojiCommand } from "./emoji-command";
import { CustomImage } from "./image";
import { CustomVideo } from "./video";
import { CustomAudio } from "./audio";
import { CustomPdf } from "./pdf";
import { MathInline, MathBlock } from "./math";
import { CustomAttachment } from "./attachment";

const lowlight = createLowlight(common);

export const getEditorExtensions = () => [
  CustomImage,
  CustomVideo,
  CustomAudio,
  CustomPdf,
  MathInline,
  MathBlock,
  CustomAttachment,
  StarterKit.configure({
    codeBlock: false,
    dropcursor: {
      color: "var(--color-text)",
      width: 2,
    },
    heading: false,
    link: false,
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
