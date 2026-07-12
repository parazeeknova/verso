/* eslint-disable */
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import { attach, detach, getController } from "./controller";

const tableHeaderPinKey = new PluginKey("tableHeaderPin");

export const TableHeaderPin = Extension.create({
  addProseMirrorPlugins() {
    let editorRoot: HTMLElement | null = null;
    let domObserver: MutationObserver | null = null;
    const tracked = new Set<HTMLElement>();
    let rafHandle: number | null = null;

    const reconcile = () => {
      rafHandle = null;
      if (!editorRoot) {
        return;
      }
      const current = new Set(editorRoot.querySelectorAll<HTMLElement>(".tableWrapper"));
      for (const w of tracked) {
        if (!current.has(w)) {
          detach(w);
          tracked.delete(w);
        }
      }
      for (const w of current) {
        if (!tracked.has(w)) {
          attach(w);
          tracked.add(w);
        }
      }
    };

    const schedule = () => {
      if (rafHandle !== null) {
        return;
      }
      rafHandle = requestAnimationFrame(reconcile);
    };

    const onMutation = (mutations: MutationRecord[]) => {
      for (const m of mutations) {
        if (m.type !== "childList") {
          continue;
        }
        for (const node of [...m.addedNodes, ...m.removedNodes]) {
          if (!(node instanceof HTMLElement)) {
            continue;
          }
          if (node.classList.contains("tableWrapper") || node.querySelector(".tableWrapper")) {
            schedule();
            return;
          }
        }
      }
    };

    return [
      new Plugin({
        key: tableHeaderPinKey,

        view(editorView) {
          editorRoot = editorView.dom as HTMLElement;

          schedule();

          domObserver = new MutationObserver(onMutation);
          domObserver.observe(editorRoot, { childList: true, subtree: true });

          return {
            destroy() {
              if (rafHandle !== null) {
                cancelAnimationFrame(rafHandle);
                rafHandle = null;
              }
              domObserver?.disconnect();
              domObserver = null;
              for (const w of tracked) detach(w);
              tracked.clear();
              editorRoot = null;
            },
            update(view, prevState) {
              if (!editorRoot) return;
              if (view.state.doc === prevState.doc) return;
              for (const w of tracked) {
                getController(w)?.refresh();
              }
            },
          };
        },
      }),
    ];
  },

  name: "tableHeaderPin",
});
