import { Extension } from "@tiptap/core";
import { typingCharPlugin } from "./typing-char-plugin";

export const TypingAnimation = Extension.create({
  addOptions() {
    return {
      duration: 280,
    };
  },

  addProseMirrorPlugins() {
    return [typingCharPlugin(this.options.duration)];
  },

  addStorage() {
    return {
      timeout: null as ReturnType<typeof setTimeout> | null,
    };
  },

  name: "typingAnimation",

  onDestroy() {
    if (this.storage.timeout) {
      clearTimeout(this.storage.timeout);
    }
    this.editor.view.dom.classList.remove("is-typing");
  },

  onTransaction({ transaction }) {
    if (!transaction.docChanged || !this.editor.isFocused) {
      return;
    }

    if (transaction.getMeta("addToHistory") === false) {
      return;
    }

    const { view } = this.editor;
    const { duration } = this.options;

    view.dom.classList.add("is-typing");

    if (this.storage.timeout) {
      clearTimeout(this.storage.timeout);
    }

    this.storage.timeout = setTimeout(() => {
      view.dom.classList.remove("is-typing");
    }, duration);
  },
});
