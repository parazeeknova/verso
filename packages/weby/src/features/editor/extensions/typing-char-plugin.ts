import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

const typingCharKey = new PluginKey("typingCharAnimation");

const findTextNodeAt = (
  element: Element,
  pos: number,
  root: HTMLElement,
): { node: Text; pos: number } | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let charCount = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const len = node.textContent?.length ?? 0;
    const start = charCount;
    charCount += len;

    if (
      pos >= start &&
      pos <= charCount &&
      root.contains(element) &&
      (element === node.parentElement || element.contains(node.parentElement))
    ) {
      return { node, pos: start };
    }
  }

  return null;
};

const cursorNodeOffset = (node: Text, root: HTMLElement): number => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;

  while (walker.nextNode()) {
    if (walker.currentNode === node) {
      return offset;
    }
    offset += walker.currentNode.textContent?.length ?? 0;
  }

  return 0;
};

export const typingCharPlugin = (duration = 280) =>
  new Plugin({
    appendTransaction: (transactions, oldState, newState) => {
      if (!transactions.some((t) => t.docChanged)) {
        return null;
      }

      requestAnimationFrame(() => {
        const pluginState = typingCharKey.get(newState) as unknown as { view?: EditorView };
        const view = pluginState?.view;
        if (!view || !view.hasFocus()) {
          return;
        }

        const sel = newState.selection;
        const cursorPos = sel.empty ? sel.from : sel.to;
        const insertedLength = newState.doc.content.size - oldState.doc.content.size;

        if (insertedLength <= 0) {
          return;
        }

        try {
          const coords = view.coordsAtPos(Math.min(cursorPos, newState.doc.content.size));
          const elements = document.elementsFromPoint(coords.left, coords.top + 2);
          const proseMirror = view.dom;

          for (const el of elements) {
            if (!proseMirror.contains(el)) {
              continue;
            }

            const textNode = findTextNodeAt(el, cursorPos, proseMirror);
            if (!textNode) {
              continue;
            }

            const parent = textNode.node.parentElement;
            if (!parent || parent.closest(".typing-char-animate")) {
              break;
            }

            const text = textNode.node.textContent ?? "";
            const offset = cursorNodeOffset(textNode.node, proseMirror);
            const insertionStart = Math.max(0, cursorPos - insertedLength - offset);
            const insertionEnd = Math.min(text.length, cursorPos - offset);

            if (insertionStart >= insertionEnd) {
              break;
            }

            const before = text.slice(0, insertionStart);
            const inserted = text.slice(insertionStart, insertionEnd);
            const after = text.slice(insertionEnd);

            const frag = document.createDocumentFragment();
            if (before) {
              frag.append(before);
            }

            const span = document.createElement("span");
            span.className = "typing-char-animate";
            span.textContent = inserted;
            frag.append(span);

            if (after) {
              frag.append(after);
            }

            textNode.node.replaceWith(frag);

            const cleanup = () => {
              if (span.parentElement) {
                span.parentElement.replaceChild(
                  document.createTextNode(span.textContent ?? ""),
                  span,
                );
                span.parentElement.normalize();
              }
            };

            span.addEventListener("animationend", cleanup, { once: true });
            setTimeout(cleanup, duration + 50);

            break;
          }
        } catch {
          // ignore positioning errors
        }
      });

      return null;
    },
    key: typingCharKey,
  });
