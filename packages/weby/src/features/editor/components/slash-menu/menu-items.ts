import {
  TextTIcon,
  CheckSquareIcon,
  TextHOneIcon,
  TextHTwoIcon,
  TextHThreeIcon,
  ListBulletsIcon,
  ListNumbersIcon,
  QuotesIcon,
  CodeIcon,
  MinusIcon,
  TableIcon,
  ScissorsIcon,
  CaretRightIcon,
  InfoIcon,
  CalendarIcon,
  ClockIcon,
  TagIcon,
  SmileyIcon,
  ColumnsIcon,
  ImageIcon,
  FileVideoIcon,
  FileAudioIcon,
  FilePdfIcon,
  PaperclipIcon,
  FunctionIcon,
  MathOperationsIcon,
  YoutubeLogo,
  GitForkIcon,
} from "@phosphor-icons/react";
import type { SlashMenuItemType } from "./types";

export const getSuggestionItems = (): SlashMenuItemType[] => [
  // --- Category 1: Standard Writing Blocks (Most Used While Typing) ---
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleNode("paragraph", "paragraph").run();
    },
    description: "Just start typing with plain text.",
    icon: TextTIcon,
    searchTerms: ["p", "paragraph", "text"],
    title: "Text",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
    },
    description: "Big section heading.",
    icon: TextHOneIcon,
    searchTerms: ["title", "big", "large", "h1"],
    title: "Heading 1",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
    },
    description: "Medium section heading.",
    icon: TextHTwoIcon,
    searchTerms: ["subtitle", "medium", "h2"],
    title: "Heading 2",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
    },
    description: "Small section heading.",
    icon: TextHThreeIcon,
    searchTerms: ["subtitle", "small", "h3"],
    title: "Heading 3",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
    description: "Create a simple bullet list.",
    icon: ListBulletsIcon,
    searchTerms: ["unordered", "point", "list", "bullet"],
    title: "Bullet list",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
    description: "Create a list with numbering.",
    icon: ListNumbersIcon,
    searchTerms: ["numbered", "ordered", "list", "ol"],
    title: "Numbered list",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
    description: "Track tasks with a to-do list.",
    icon: CheckSquareIcon,
    searchTerms: ["todo", "task", "list", "check", "checkbox"],
    title: "To-do list",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
    description: "Create block quote.",
    icon: QuotesIcon,
    searchTerms: ["blockquote", "quotes", "quote"],
    title: "Quote",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
    description: "Insert code snippet.",
    icon: CodeIcon,
    searchTerms: ["codeblock", "code"],
    title: "Code",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setMathInline({ text: "" }).run();
    },
    description: "Inline mathematical expression.",
    icon: FunctionIcon,
    searchTerms: ["math", "latex", "equation", "inline", "formula"],
    title: "Math (inline)",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setMathBlock({ text: "" }).run();
    },
    description: "Block mathematical expression.",
    icon: MathOperationsIcon,
    searchTerms: ["math", "latex", "equation", "block", "formula"],
    title: "Math (block)",
  },

  // --- Category 2: Structure & Media Features (Common Layout/Embeds) ---
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
    icon: TableIcon,
    searchTerms: ["table", "rows", "columns"],
    title: "Table",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCallout().run();
    },
    description: "Insert a callout block.",
    icon: InfoIcon,
    searchTerms: ["callout", "info", "alert"],
    title: "Callout",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
    description: "Insert horizontal rule divider.",
    icon: MinusIcon,
    searchTerms: ["horizontal rule", "hr", "divider", "line"],
    title: "Divider",
  },
  {
    command: ({ editor, range }) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          editor.chain().focus().deleteRange(range).run();
          const { uploadImage } = await import("../image/upload-image");
          void uploadImage(file, editor, editor.state.selection.from);
        }
      });
      input.click();
    },
    description: "Upload an image.",
    icon: ImageIcon,
    searchTerms: ["image", "picture", "photo", "upload"],
    title: "Image",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setYoutubeVideo({ src: "" }).run();
    },
    description: "Embed YouTube video.",
    icon: YoutubeLogo,
    searchTerms: ["youtube", "yt", "video", "embed"],
    title: "YouTube",
  },
  {
    command: ({ editor, range }) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "video/*";
      input.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          editor.chain().focus().deleteRange(range).run();
          const { uploadVideo } = await import("../video/upload-video");
          void uploadVideo(file, editor, editor.state.selection.from);
        }
      });
      input.click();
    },
    description: "Upload a video.",
    icon: FileVideoIcon,
    searchTerms: ["video", "movie", "film", "upload"],
    title: "Video",
  },
  {
    command: ({ editor, range }) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "audio/*";
      input.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          editor.chain().focus().deleteRange(range).run();
          const { uploadAudio } = await import("../audio/upload-audio");
          void uploadAudio(file, editor, editor.state.selection.from);
        }
      });
      input.click();
    },
    description: "Upload an audio file.",
    icon: FileAudioIcon,
    searchTerms: ["audio", "sound", "music", "podcast", "upload"],
    title: "Audio",
  },
  {
    command: ({ editor, range }) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/pdf";
      input.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          editor.chain().focus().deleteRange(range).run();
          const { uploadPdf } = await import("../pdf/upload-pdf");
          void uploadPdf(file, editor, editor.state.selection.from);
        }
      });
      input.click();
    },
    description: "Upload a PDF document.",
    icon: FilePdfIcon,
    searchTerms: ["pdf", "document", "file", "embed", "upload"],
    title: "PDF",
  },
  {
    command: ({ editor, range }) => {
      const input = document.createElement("input");
      input.type = "file";
      input.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          editor.chain().focus().deleteRange(range).run();
          const { uploadAttachment } = await import("../attachment/upload-attachment");
          void uploadAttachment(file, editor, editor.state.selection.from);
        }
      });
      input.click();
    },
    description: "Attach any file.",
    icon: PaperclipIcon,
    searchTerms: ["attachment", "file", "attach", "upload", "download"],
    title: "File Attachment",
  },

  // --- Category 3: Extras (Advanced Options / Inline Helpers / Layouts) ---
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setDetails().run();
    },
    description: "Insert a toggle block.",
    icon: CaretRightIcon,
    searchTerms: ["collapsible", "block", "toggle", "details", "expand"],
    title: "Toggle block",
  },
  {
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setCodeBlock({ language: "mermaid" })
        .insertContent("flowchart LR\n    A --> B")
        .run();
    },
    description: "Insert mermaid diagram.",
    icon: GitForkIcon,
    searchTerms: ["mermaid", "diagram", "chart", "flowchart", "uml"],
    title: "Mermaid diagram",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setStatus({ color: "gray", text: "" }).run();
    },
    description: "Insert inline status badge.",
    icon: TagIcon,
    searchTerms: ["status", "badge", "label", "lozenge"],
    title: "Status",
  },
  {
    command: ({ editor, range }) => {
      const currentDate = new Date().toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      editor.chain().focus().deleteRange(range).insertContent(currentDate).run();
    },
    description: "Insert current date.",
    icon: CalendarIcon,
    searchTerms: ["date", "today"],
    title: "Date",
  },
  {
    command: ({ editor, range }) => {
      const currentTime = new Date().toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "numeric",
      });
      editor.chain().focus().deleteRange(range).insertContent(currentTime).run();
    },
    description: "Insert current time.",
    icon: ClockIcon,
    searchTerms: ["time", "now", "clock"],
    title: "Time",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertContent(":").run();
    },
    description: "Insert emoji.",
    icon: SmileyIcon,
    searchTerms: ["emoji", "face", "smile"],
    title: "Emoji",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setPageBreak().run();
    },
    description: "Insert a page break for printing.",
    icon: ScissorsIcon,
    searchTerms: ["page", "break", "pagebreak", "print"],
    title: "Page break",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertColumns({ layout: "two_equal" }).run();
    },
    description: "Insert 2 columns layout.",
    icon: ColumnsIcon,
    searchTerms: ["columns", "layout", "two", "2"],
    title: "2 Columns",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertColumns({ layout: "three_equal" }).run();
    },
    description: "Insert 3 columns layout.",
    icon: ColumnsIcon,
    searchTerms: ["columns", "layout", "three", "3"],
    title: "3 Columns",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertColumns({ layout: "four_equal" }).run();
    },
    description: "Insert 4 columns layout.",
    icon: ColumnsIcon,
    searchTerms: ["columns", "layout", "four", "4"],
    title: "4 Columns",
  },
  {
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertColumns({ layout: "five_equal" }).run();
    },
    description: "Insert 5 columns layout.",
    icon: ColumnsIcon,
    searchTerms: ["columns", "layout", "five", "5"],
    title: "5 Columns",
  },
];
