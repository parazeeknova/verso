// eslint-disable curly, no-plusplus, unicorn/consistent-function-scoping, unicorn/no-array-for-each, typescript-eslint/no-explicit-any, unicorn/prefer-dom-node-dataset, sort-keys, no-shadow, unicorn/prefer-ternary, react-hooks/exhaustive-deps, promise/prefer-await-to-callbacks, promise/prefer-await-to-then, jsx-a11y/prefer-tag-over-role
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { ActionIcon, Group, Select, Tooltip, CopyButton } from "@mantine/core";
import { useEffect, useState, lazy, Suspense } from "react";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import classes from "./code-block.module.css";
import { useTranslation } from "react-i18next";

const MermaidView = lazy(() => import("./mermaid-view"));

export default function CodeBlockView(props: NodeViewProps) {
  const { t } = useTranslation();
  const { node, updateAttributes, extension, editor, getPos } = props;
  const { language } = node.attrs as { language: string | null };
  const [languageValue, setLanguageValue] = useState<string | null>(language || null);
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    const updateSelection = () => {
      const { state } = editor;
      const { from, to } = state.selection;
      const pos = getPos();
      if (pos === undefined) {
        return;
      }
      const isNodeSelected =
        (from >= pos && from < pos + node.nodeSize) || (to > pos && to <= pos + node.nodeSize);
      setIsSelected(isNodeSelected);
    };

    editor.on("selectionUpdate", updateSelection);
    return () => {
      editor.off("selectionUpdate", updateSelection);
    };
  }, [editor, getPos, node.nodeSize]);

  const changeLanguage = (lang: string | null) => {
    setLanguageValue(lang);
    updateAttributes({
      language: lang || null,
    });
  };

  // We extract listLanguages from the lowlight option in the extension
  const lowlightOpt = (extension.options as Record<string, unknown>).lowlight as
    | { listLanguages: () => string[] }
    | undefined;
  const languagesList = lowlightOpt?.listLanguages() || [];
  const sortedLanguages = [...languagesList].toSorted();

  return (
    <NodeViewWrapper className="codeBlock">
      <Group
        justify="flex-end"
        contentEditable={false}
        className={classes.menuGroup}
        gap="xs"
        mb="xs"
      >
        <Select
          placeholder="auto"
          checkIconPosition="right"
          data={sortedLanguages}
          value={languageValue}
          onChange={changeLanguage}
          searchable
          style={{ maxWidth: "130px" }}
          classNames={{ input: classes.selectInput }}
          disabled={!editor.isEditable}
          radius={0}
          comboboxProps={{ radius: 0 }}
        />

        <CopyButton value={node?.textContent || ""} timeout={2000}>
          {({ copied, copy }) => (
            <Tooltip
              label={copied ? t("Copied") : t("Copy")}
              withArrow
              position="right"
              radius={0}
              color="dark"
            >
              <ActionIcon
                color={copied ? "teal" : "gray"}
                variant="subtle"
                onClick={copy}
                radius={0}
                style={{
                  color: copied ? undefined : "var(--color-accent)",
                }}
              >
                {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>

      <pre
        spellCheck="false"
        hidden={
          ((language === "mermaid" && !editor.isEditable) ||
            (language === "mermaid" && !isSelected)) &&
          node.textContent.length > 0
        }
      >
        {/* @ts-expect-error: NodeViewContent component only permits div/span elements natively in types */}
        <NodeViewContent as="code" className={language ? `language-${language}` : ""} />
      </pre>

      {language === "mermaid" && (
        <Suspense fallback={null}>
          <MermaidView props={props} />
        </Suspense>
      )}
    </NodeViewWrapper>
  );
}
