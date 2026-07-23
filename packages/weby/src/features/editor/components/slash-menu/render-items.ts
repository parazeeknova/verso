import { ReactRenderer } from "@tiptap/react";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { SlashMenuItemType } from "./types";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { animateIn, animateOut } from "#/shared/lib/animate-popup";
import { CommandList } from "./command-list";
import type { CommandListRef } from "./command-list";

const renderItems = () => {
  let component: ReactRenderer<CommandListRef, SuggestionProps<SlashMenuItemType>> | null = null;
  let popup: HTMLElement | null = null;
  let cleanup: (() => void) | null = null;
  let getReferenceClientRect: (() => DOMRect) | null = null;

  const updatePosition = () => {
    if (!popup || !getReferenceClientRect) {
      return;
    }

    const rect = getReferenceClientRect();

    /* eslint-disable promise/prefer-await-to-then */
    computePosition({ getBoundingClientRect: () => rect }, popup, {
      middleware: [offset(8), flip(), shift()],
      placement: "bottom-start",
    })
      .then(({ x, y }) => {
        if (popup) {
          popup.style.left = `${x}px`;
          popup.style.top = `${y}px`;
        }
      })
      .catch(() => {
        // ignore
      });
    /* eslint-enable promise/prefer-await-to-then */
  };

  return {
    onExit: () => {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }

      animateOut(popup, () => {
        if (popup) {
          popup.remove();
          popup = null;
        }

        if (component) {
          component.destroy();
          component = null;
        }
      });
    },
    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        if (popup) {
          animateOut(popup, () => {
            if (popup) {
              popup.style.display = "none";
            }
          });
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

      animateIn(popup);

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

      if (popup) {
        const wasHidden = popup.style.display === "none";
        popup.style.display = "";
        if (wasHidden) {
          animateIn(popup);
        }
      }

      if (!props.clientRect) {
        return;
      }

      getReferenceClientRect = props.clientRect as () => DOMRect;
      void updatePosition();
    },
  };
};

export default renderItems;
