import { ReactRenderer } from "@tiptap/react";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { SlashMenuItemType } from "./types";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { CommandList } from "./command-list";
import type { CommandListRef } from "./command-list";

const renderItems = () => {
  let component: ReactRenderer<CommandListRef, SuggestionProps<SlashMenuItemType>> | null = null;
  let popup: HTMLElement | null = null;
  let cleanup: (() => void) | null = null;
  let getReferenceClientRect: (() => DOMRect) | null = null;

  const updatePosition = async () => {
    if (!popup || !getReferenceClientRect) {
      return;
    }

    const rect = getReferenceClientRect();

    try {
      const { x, y } = await computePosition({ getBoundingClientRect: () => rect }, popup, {
        middleware: [offset(8), flip(), shift()],
        placement: "bottom-start",
      });
      if (popup) {
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
      }
    } catch {
      // ignore
    }
  };

  return {
    onExit: () => {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }

      if (popup) {
        popup.remove();
        popup = null;
      }

      if (component) {
        component.destroy();
        component = null;
      }
    },
    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        if (popup) {
          popup.style.display = "none";
        }
        return true;
      }

      return component?.ref?.onKeyDown(props) ?? false;
    },
    onStart: (props: SuggestionProps<SlashMenuItemType>) => {
      component = new ReactRenderer(CommandList, {
        editor: props.editor,
        props,
      });

      if (!props.clientRect) {
        return;
      }

      getReferenceClientRect = props.clientRect as () => DOMRect;

      popup = document.createElement("div");
      popup.style.zIndex = "199";
      popup.style.position = "absolute";
      popup.style.top = "0";
      popup.style.left = "0";

      document.body.append(popup);
      if (component) {
        popup.append(component.element);
      }

      cleanup = autoUpdate(
        {
          getBoundingClientRect: () =>
            getReferenceClientRect ? getReferenceClientRect() : new DOMRect(),
        },
        popup,
        updatePosition,
      );
    },
    onUpdate: (props: SuggestionProps<SlashMenuItemType>) => {
      component?.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      getReferenceClientRect = props.clientRect as () => DOMRect;
      void updatePosition();
    },
  };
};

export default renderItems;
