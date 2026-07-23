import { Mark, mergeAttributes } from "@tiptap/core";

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      setComment: (commentId: string) => ReturnType;
      unsetComment: (commentId: string) => ReturnType;
      setCommentResolved: (commentId: string, resolved: boolean) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create<CommentMarkOptions>({
  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.dataset.commentId,
        renderHTML: (attributes) => {
          if (!attributes.commentId) {
            return {};
          }
          return {
            "data-comment-id": attributes.commentId,
          };
        },
      },
      resolved: {
        default: false,
        parseHTML: (element) => element.dataset.resolved === "true",
        renderHTML: (attributes) => {
          if (!attributes.resolved) {
            return {};
          }
          return {
            "data-resolved": "true",
          };
        },
      },
    };
  },
  addCommands() {
    return {
      setComment:
        (commentId) =>
        ({ commands }) => {
          if (!commentId) {
            return false;
          }
          return commands.setMark(this.name, { commentId, resolved: false });
        },
      setCommentResolved:
        (commentId, resolved) =>
        ({ tr, dispatch }) => {
          if (!commentId) {
            return false;
          }

          tr.doc.descendants((node, pos) => {
            const from = pos;
            const to = pos + node.nodeSize;
            const mark = node.marks.find(
              (m) => m.type.name === this.name && m.attrs.commentId === commentId,
            );
            if (mark) {
              tr.removeMark(from, to, mark);
              tr.addMark(
                from,
                to,
                this.type.create({
                  commentId,
                  resolved,
                }),
              );
            }
          });

          if (dispatch) {
            dispatch(tr);
          }
          return true;
        },
      unsetComment:
        (commentId) =>
        ({ tr, dispatch }) => {
          if (!commentId) {
            return false;
          }

          tr.doc.descendants((node, pos) => {
            const from = pos;
            const to = pos + node.nodeSize;
            const mark = node.marks.find(
              (m) => m.type.name === this.name && m.attrs.commentId === commentId,
            );
            if (mark) {
              tr.removeMark(from, to, mark);
            }
          });

          if (dispatch) {
            dispatch(tr);
          }
          return true;
        },
    };
  },
  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  exitable: true,

  inclusive: false,

  name: "comment",

  parseHTML() {
    return [
      {
        getAttrs: (element) => {
          const el = element as HTMLElement;
          const { commentId } = el.dataset;
          const resolved = el.dataset.resolved === "true";
          if (!commentId) {
            return false;
          }
          return { commentId, resolved };
        },
        tag: "span[data-comment-id]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const resolved = HTMLAttributes["data-resolved"] === "true";
    const className = `comment-mark cursor-pointer border-b-2 transition-colors ${
      resolved
        ? "border-green-500/40 bg-green-500/10 text-text"
        : "border-yellow-500/60 bg-yellow-500/15 text-text hover:bg-yellow-500/25"
    }`;

    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: className,
      }),
      0,
    ];
  },
});
