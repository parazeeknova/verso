import { Youtube } from "@tiptap/extension-youtube";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { YoutubeView } from "../components/youtube/youtube-view";

export const CustomYoutube = Youtube.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => (element.dataset.align as "left" | "center" | "right") || "center",
        renderHTML: (attributes) => ({
          "data-align": attributes.align,
        }),
      },
    };
  },
  addCommands() {
    return {
      setYoutubeVideo:
        (options: { src: string; width?: number; height?: number }) =>
        ({ chain, state }) => {
          const pos = state.selection.from;
          return chain()
            .insertContent({ attrs: options, type: this.name })
            .command(({ tr }) => {
              try {
                const selectionType = NodeSelection.create(tr.doc, pos);
                tr.setSelection(selectionType);
              } catch {
                // fallback
              }
              return true;
            })
            .run();
        },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(YoutubeView);
  },
});

export default CustomYoutube;
