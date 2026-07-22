// eslint-disable-next-line import/no-named-as-default
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { HeadingWithIds } from "./tiptap-heading-ids";
import { Link } from "@tiptap/extension-link";

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

export interface TiptapHeading {
  id: string;
  label: string;
  level: number;
}

interface ReadonlyBlogEditorProps {
  content: Record<string, unknown> | null;
  onHeadingsExtracted?: (headings: TiptapHeading[]) => void;
}

export const ReadonlyBlogEditor = ({ content, onHeadingsExtracted }: ReadonlyBlogEditorProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  const validContent = useMemo(
    () =>
      content &&
      typeof content === "object" &&
      content.type === "doc" &&
      Array.isArray(content.content)
        ? content
        : { content: [], type: "doc" },
    [content],
  );

  const extractHeadings = useCallback(() => {
    const container = wrapperRef.current;
    if (!container) {
      return;
    }
    const headingElements = container.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const headings: TiptapHeading[] = [];
    for (const el of headingElements) {
      const { id } = el;
      const level = Number.parseInt(el.tagName[1] || "1", 10);
      const label = el.textContent || "";
      if (id && label) {
        headings.push({ id, label, level });
      }
    }
    onHeadingsExtracted?.(headings);
  }, [onHeadingsExtracted]);

  const editor = useEditor({
    content: validContent,
    editable: false,
    extensions: [
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
    ],
    immediatelyRender: false,
    onCreate: () => {
      // Extract headings after Tiptap renders content to DOM
      requestAnimationFrame(() => {
        extractHeadings();
        // Fallbacks in case DOM isn't ready yet
        setTimeout(extractHeadings, 100);
        setTimeout(extractHeadings, 300);
      });
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.commands.setContent(validContent);
  }, [editor, validContent]);

  // Collapse blank lines in code blocks
  useEffect(() => {
    const container = wrapperRef.current;
    if (!container) {
      return;
    }

    const collapseBlankLines = () => {
      const codeLines = container.querySelectorAll(".ProseMirror-code-block .ProseMirror-line");
      for (const line of codeLines) {
        const element = line as HTMLElement;
        const text = element.textContent?.trim() ?? "";
        if (text === "") {
          element.style.height = "0";
          element.style.minHeight = "0";
          element.style.lineHeight = "0";
          element.style.fontSize = "0";
          element.style.margin = "0";
          element.style.padding = "0";
        }
      }
    };

    collapseBlankLines();
    const timers = [
      setTimeout(collapseBlankLines, 100),
      setTimeout(collapseBlankLines, 300),
      setTimeout(collapseBlankLines, 500),
    ];

    const observer = new MutationObserver(() => collapseBlankLines());
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      observer.disconnect();
    };
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div ref={wrapperRef} className="blog-reader-prose">
      <EditorContent editor={editor} />
    </div>
  );
};
