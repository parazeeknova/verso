// eslint-disable-next-line import/no-named-as-default
import StarterKit from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { Link } from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table/row";
import { TableCell } from "@tiptap/extension-table/cell";
import { TableHeader } from "@tiptap/extension-table/header";
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

const lowlight = createLowlight(common);

export const getEditorExtensions = () => [
  StarterKit.configure({
    codeBlock: false,
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
  CodeBlockLowlight.configure({
    defaultLanguage: "plaintext",
    lowlight,
  }),
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableCell,
  TableHeader,
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
];
