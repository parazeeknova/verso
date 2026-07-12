import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import mermaid from "mermaid";
import classes from "./code-block.module.css";
import { useTheme } from "#/shared/hooks/use-theme";

interface MermaidViewProps {
  props: NodeViewProps;
}

export default function MermaidView({ props }: MermaidViewProps) {
  const { isDarkMode } = useTheme();
  const { node } = props;
  const [preview, setPreview] = useState<string>("");
  const [mermaidErr, setMermaidErr] = useState<string | null>(null);

  // Update Mermaid config when theme changes.
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      theme: isDarkMode ? "dark" : "default",
    });
  }, [isDarkMode]);

  // Re-render the diagram whenever the node content or theme changes.
  useEffect(() => {
    const renderDiagram = async () => {
      const randomId = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      if (node.textContent.length > 0) {
        try {
          const item = await mermaid.render(randomId, node.textContent);
          setPreview(item.svg);
          setMermaidErr(null);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          if (props.editor.isEditable) {
            setMermaidErr(`Mermaid diagram error: ${errMsg}`);
          } else {
            setMermaidErr("Invalid Mermaid diagram");
          }
        }
      } else {
        setPreview("");
        setMermaidErr(null);
      }
    };
    void renderDiagram();
  }, [node.textContent, isDarkMode, props.editor.isEditable]);

  if (mermaidErr) {
    return (
      <div className={classes.error} contentEditable={false}>
        {mermaidErr}
      </div>
    );
  }

  return (
    <div
      className={classes.mermaid}
      contentEditable={false}
      dangerouslySetInnerHTML={{ __html: preview }}
    />
  );
}
