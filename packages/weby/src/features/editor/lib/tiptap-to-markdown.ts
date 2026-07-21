import type { JSONContent } from "@tiptap/core";

const renderInline = (nodes?: JSONContent[]): string => {
  if (!nodes) {
    return "";
  }
  return nodes
    .map((node) => {
      if (node.type === "text") {
        let text = node.text || "";
        if (node.marks) {
          for (const mark of node.marks) {
            if (mark.type === "bold") {
              text = `**${text}**`;
            } else if (mark.type === "italic") {
              text = `*${text}*`;
            } else if (mark.type === "code") {
              text = `\`${text}\``;
            } else if (mark.type === "strike") {
              text = `~~${text}~~`;
            } else if (mark.type === "link") {
              text = `[${text}](${mark.attrs?.href || ""})`;
            } else if (mark.type === "highlight") {
              text = `==${text}==`;
            }
          }
        }
        return text;
      }
      if (node.type === "hardBreak") {
        return "\n";
      }
      if (node.type === "image") {
        return `![${node.attrs?.alt || ""}](${node.attrs?.src || ""})`;
      }
      return "";
    })
    .join("");
};

const renderMedia = (node: JSONContent): string => {
  switch (node.type) {
    case "image": {
      return `![${node.attrs?.alt || ""}](${node.attrs?.src || ""})`;
    }
    case "youtube":
    case "video": {
      return `[video](${node.attrs?.src || ""})`;
    }
    case "audio": {
      return `[audio](${node.attrs?.src || ""})`;
    }
    case "pdf": {
      return `[pdf](${node.attrs?.src || ""})`;
    }
    default: {
      return "";
    }
  }
};

type BlockRenderer = (node: JSONContent, listPrefix?: string) => string;

const renderTable = (rows: JSONContent[], renderFn: BlockRenderer): string => {
  if (rows.length === 0) {
    return "";
  }
  const tableLines: string[] = [];
  for (let rIdx = 0; rIdx < rows.length; rIdx += 1) {
    const row = rows[rIdx];
    const cells = (row?.content || []).map((cell) =>
      (cell.content || []).map((c) => renderFn(c)).join(" "),
    );
    tableLines.push(`| ${cells.join(" | ")} |`);
    if (rIdx === 0) {
      const sep = cells.map(() => "---").join(" | ");
      tableLines.push(`| ${sep} |`);
    }
  }
  return tableLines.join("\n");
};

const renderList = (node: JSONContent, renderFn: BlockRenderer, listPrefix = ""): string => {
  switch (node.type) {
    case "bulletList": {
      return (node.content || []).map((child) => renderFn(child, "- ")).join("\n");
    }
    case "orderedList": {
      return (node.content || []).map((child, idx) => renderFn(child, `${idx + 1}. `)).join("\n");
    }
    case "taskList": {
      return (node.content || []).map((child) => renderFn(child)).join("\n");
    }
    case "taskItem": {
      const checked = node.attrs?.checked ? "[x]" : "[ ]";
      const text = (node.content || []).map((child) => renderFn(child)).join(" ");
      return `- ${checked} ${text}`;
    }
    case "listItem": {
      const text = (node.content || []).map((child) => renderFn(child)).join(" ");
      return `${listPrefix}${text}`;
    }
    default: {
      return "";
    }
  }
};

const renderSimpleBlock = (node: JSONContent, renderFn: BlockRenderer): string => {
  switch (node.type) {
    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      return `${"#".repeat(level)} ${renderInline(node.content)}`;
    }
    case "paragraph": {
      return renderInline(node.content);
    }
    case "blockquote": {
      const inner = (node.content || []).map((child) => renderFn(child)).join("\n> ");
      return `> ${inner}`;
    }
    case "codeBlock": {
      const lang = (node.attrs?.language as string) || "";
      const codeText = (node.content || []).map((n) => n.text || "").join("");
      return `\`\`\`${lang}\n${codeText}\n\`\`\``;
    }
    case "horizontalRule": {
      return "---";
    }
    case "callout": {
      const icon = node.attrs?.icon ? `${node.attrs.icon} ` : "";
      const text = (node.content || []).map((child) => renderFn(child)).join(" ");
      return `> **${icon}** ${text}`;
    }
    default: {
      return renderInline(node.content);
    }
  }
};

const renderBlock: BlockRenderer = (node, listPrefix = "") => {
  if (
    node.type === "bulletList" ||
    node.type === "orderedList" ||
    node.type === "taskList" ||
    node.type === "taskItem" ||
    node.type === "listItem"
  ) {
    return renderList(node, renderBlock, listPrefix);
  }
  if (node.type === "table") {
    return renderTable(node.content || [], renderBlock);
  }
  if (
    node.type === "image" ||
    node.type === "youtube" ||
    node.type === "video" ||
    node.type === "audio" ||
    node.type === "pdf"
  ) {
    return renderMedia(node);
  }
  return renderSimpleBlock(node, renderBlock);
};

export const tiptapToMarkdown = (doc: JSONContent | null | undefined, title?: string): string => {
  if (!doc) {
    return title ? `# ${title}\n` : "";
  }

  const lines: string[] = [];
  if (title) {
    lines.push(`# ${title}\n`);
  }

  for (const block of doc.content || []) {
    const rendered = renderBlock(block);
    if (rendered !== undefined) {
      lines.push(rendered);
    }
  }

  return lines.join("\n\n");
};
