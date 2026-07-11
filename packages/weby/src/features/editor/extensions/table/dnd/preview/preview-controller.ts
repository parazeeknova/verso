/* eslint-disable */
import { computePosition, offset, shift } from "@floating-ui/dom";
import type { ReferenceElement } from "@floating-ui/dom";
import type { DraggingDOMs } from "../utils";
import { clearPreviewDOM, createPreviewDOM } from "./render-preview";

export class PreviewController {
  private _preview: HTMLElement;

  constructor() {
    this._preview = document.createElement("div");
    this._preview.classList.add("table-dnd-preview");
    this._preview.classList.add("ProseMirror");
    Object.assign(this._preview.style, {
      display: "none",
      pointerEvents: "none",
      position: "absolute",
    });
  }

  get previewRoot(): HTMLElement {
    return this._preview;
  }

  onDragStart = (relatedDoms: DraggingDOMs, index: number | undefined, type: "col" | "row") => {
    this._initPreviewStyle(relatedDoms.table, relatedDoms.cell, type);
    createPreviewDOM(relatedDoms.table, this._preview, index ?? 0, type);
    this._initPreviewPosition(relatedDoms.table, relatedDoms.cell, type);
  };

  onDragEnd = () => {
    clearPreviewDOM(this._preview);
    Object.assign(this._preview.style, { display: "none" });
  };

  onDragging = (relatedDoms: DraggingDOMs, x: number, y: number, type: "col" | "row") => {
    this._updatePreviewPosition(x, y, relatedDoms.table, relatedDoms.cell, type);
  };

  destroy = () => {
    this._preview.remove();
  };

  private _initPreviewStyle(
    table: HTMLTableElement,
    cell: HTMLTableCellElement,
    type: "col" | "row",
  ) {
    const tableRect = table.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();

    if (type === "col") {
      Object.assign(this._preview.style, {
        display: "block",
        height: `${tableRect.height}px`,
        width: `${cellRect.width}px`,
      });
    }

    if (type === "row") {
      Object.assign(this._preview.style, {
        display: "block",
        height: `${cellRect.height}px`,
        width: `${tableRect.width}px`,
      });
    }
  }

  private _initPreviewPosition(table: HTMLElement, cell: HTMLElement, type: "col" | "row") {
    void computePosition(cell, this._preview, {
      middleware: [
        offset(({ rects }) => {
          if (type === "col") {
            return -rects.reference.height;
          }
          return -rects.reference.width;
        }),
        shift({ boundary: table, padding: 0 }),
      ],
      placement: type === "row" ? "right" : "bottom",
    }).then(({ x, y }) => {
      Object.assign(this._preview.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    });
  }

  // Clamp the preview to within the table's bounds via `shift({ boundary })`
  // so it can't track the cursor past the table edge. Without the clamp,
  // dragging near the viewport edge pushes the preview's `left` (or `top`)
  // beyond the document's natural width/height, the browser extends the
  // page to contain it, and the auto-scroll plugin then has a wider area
  // to keep scrolling into — a feedback loop that grows the page forever.
  private _updatePreviewPosition(
    x: number,
    y: number,
    table: HTMLElement,
    cell: HTMLElement,
    type: "col" | "row",
  ) {
    computePosition(getVirtualElement(cell, x, y), this._preview, {
      middleware: [shift({ boundary: table, padding: 0 })],
      placement: type === "row" ? "right" : "bottom",
    }).then(({ x, y }) => {
      if (type === "row") {
        Object.assign(this._preview.style, {
          top: `${y}px`,
        });
        return;
      }

      if (type === "col") {
        Object.assign(this._preview.style, {
          left: `${x}px`,
        });
        return;
      }
    });
  }
}

function getVirtualElement(cell: HTMLElement, x: number, y: number): ReferenceElement {
  return {
    contextElement: cell,
    getBoundingClientRect: () => {
      const rect = cell.getBoundingClientRect();
      return {
        bottom: y + rect.height / 2,
        height: rect.height,
        left: x - rect.width / 2,
        right: x + rect.width / 2,
        top: y - rect.height / 2,
        width: rect.width,
        x: x - rect.width / 2,
        y: y - rect.height / 2,
      };
    },
  };
}
