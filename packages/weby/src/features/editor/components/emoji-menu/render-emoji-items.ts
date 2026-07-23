import { ReactRenderer } from "@tiptap/react";
import type { SuggestionProps } from "@tiptap/suggestion";
import { EmojiList } from "./emoji-list";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import { animateIn, animateOut } from "#/shared/lib/animate-popup";

export const renderEmojiItems = () => {
  let component: ReactRenderer | null = null;
  let popup: HTMLDivElement | null = null;
  let cleanup: (() => void) | null = null;
  let getReferenceClientRect: (() => DOMRect) | null = null;

  const destroy = () => {
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
  };

  return {
    onBeforeStart: (props: SuggestionProps) => {
      component = new ReactRenderer(EmojiList, {
        editor: props.editor,
        props: { isLoading: true, items: [] },
      });

      if (!props.clientRect) {
        return;
      }

      getReferenceClientRect = props.clientRect as () => DOMRect;
      popup = document.createElement("div");
      popup.style.zIndex = "9999";
      popup.style.position = "absolute";
      popup.style.top = "0";
      popup.style.left = "0";
      popup.append(component.element);
      document.body.append(popup);

      animateIn(popup);

      const virtualElement = {
        getBoundingClientRect: () =>
          getReferenceClientRect ? getReferenceClientRect() : new DOMRect(0, 0, 0, 0),
      };

      cleanup = autoUpdate(virtualElement, popup, () => {
        if (!popup) {
          return;
        }

        const updatePosition = async () => {
          if (!popup) {
            return;
          }
          try {
            const { x, y } = await computePosition(virtualElement, popup, {
              middleware: [offset(10), flip(), shift()],
              placement: "bottom-start",
            });
            if (popup) {
              Object.assign(popup.style, {
                transform: `translate(${x}px, ${y}px)`,
              });
            }
          } catch (error) {
            console.error("Failed to compute position", error);
          }
        };
        void updatePosition();
      });
    },
    onExit: () => {
      destroy();
    },
    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        destroy();

        return true;
      }

      // @ts-expect-error: component ref onKeyDown might not be typed
      return component?.ref?.onKeyDown(props);
    },
    onStart: (props: SuggestionProps) => {
      component?.updateProps({ ...props, isLoading: false });

      if (props.clientRect) {
        getReferenceClientRect = props.clientRect as () => DOMRect;
      }
    },
    onUpdate: (props: SuggestionProps) => {
      component?.updateProps(props);

      if (props.clientRect) {
        getReferenceClientRect = props.clientRect as () => DOMRect;
      }
    },
  };
};

export default renderEmojiItems;
