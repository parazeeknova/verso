/* eslint-disable */
import { computePosition, offset } from "@floating-ui/dom";
import type { DraggingDOMs } from "../utils";

const DROP_INDICATOR_WIDTH = 2;

export class DropIndicatorController {
  private _dropIndicator: HTMLElement;
  private _generation = 0;

  constructor() {
    this._dropIndicator = document.createElement("div");
    this._dropIndicator.classList.add("table-dnd-drop-indicator");
    Object.assign(this._dropIndicator.style, {
      pointerEvents: "none",
      position: "absolute",
    });
  }

  get dropIndicatorRoot() {
    return this._dropIndicator;
  }

  onDragStart = (relatedDoms: DraggingDOMs, type: "col" | "row") => {
    this._initDropIndicatorStyle(relatedDoms.table, type);
    this._initDropIndicatorPosition(relatedDoms.cell, type);
    this._dropIndicator.dataset.dragging = "true";
  };

  onDragEnd = () => {
    Object.assign(this._dropIndicator.style, { display: "none" });
    this._dropIndicator.dataset.dragging = "false";
  };

  onDragging = (
    target: Element,
    direction: "left" | "right" | "up" | "down",
    type: "col" | "row",
  ) => {
    const gen = ++this._generation;
    if (type === "col") {
      void computePosition(target, this._dropIndicator, {
        middleware: [offset(direction === "left" ? -1 * DROP_INDICATOR_WIDTH : 0)],
        placement: direction === "left" ? "left" : "right",
      }).then(({ x }) => {
        if (gen !== this._generation) return;
        Object.assign(this._dropIndicator.style, { left: `${x}px` });
      });

      return;
    }

    if (type === "row") {
      void computePosition(target, this._dropIndicator, {
        middleware: [offset(direction === "up" ? -1 * DROP_INDICATOR_WIDTH : 0)],
        placement: direction === "up" ? "top" : "bottom",
      }).then(({ y }) => {
        if (gen !== this._generation) return;
        Object.assign(this._dropIndicator.style, { top: `${y}px` });
      });

      return;
    }
  };

  destroy = () => {
    this._dropIndicator.remove();
  };

  private _initDropIndicatorStyle = (table: HTMLElement, type: "col" | "row") => {
    const tableRect = table.getBoundingClientRect();

    if (type === "col") {
      Object.assign(this._dropIndicator.style, {
        display: "block",
        height: `${tableRect.height}px`,
        width: `${DROP_INDICATOR_WIDTH}px`,
      });
      return;
    }

    if (type === "row") {
      Object.assign(this._dropIndicator.style, {
        display: "block",
        height: `${DROP_INDICATOR_WIDTH}px`,
        width: `${tableRect.width}px`,
      });
    }
  };

  private _initDropIndicatorPosition = (cell: HTMLElement, type: "col" | "row") => {
    void computePosition(cell, this._dropIndicator, {
      middleware: [
        offset(({ rects }) => {
          if (type === "col") {
            return -rects.reference.height;
          }
          return -rects.reference.width;
        }),
      ],
      placement: type === "row" ? "right" : "bottom",
    }).then(({ x, y }) => {
      Object.assign(this._dropIndicator.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    });
  };
}
