import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import { getEditorExtensions } from "./index";

describe("columns extension", () => {
  it("allows nesting other blocks inside a column node", () => {
    const editor = new Editor({
      extensions: getEditorExtensions(),
    });

    const { schema } = editor;
    expect(schema.nodes.columns).toBeDefined();
    expect(schema.nodes.column).toBeDefined();

    const columnSpec = schema.nodes.column.spec;
    expect(columnSpec.content).toBe("block+");

    editor.commands.insertColumns({ layout: "two_equal" });

    // Verify it allows toggling bullet list inside a column
    const toggled = editor.commands.toggleBulletList();
    expect(toggled).toBe(true);
    expect(editor.isActive("bulletList")).toBe(true);
  });

  it("allows columns to be nested inside details and callout nodes", () => {
    const editor = new Editor({
      extensions: getEditorExtensions(),
    });

    editor.commands.toggleCallout();
    expect(editor.isActive("callout")).toBe(true);

    const inserted = editor.commands.insertColumns({ layout: "two_equal" });
    expect(inserted).toBe(true);
    expect(editor.isActive("columns")).toBe(true);
  });

  it("allows table to be nested inside a column node", () => {
    const editor = new Editor({
      extensions: getEditorExtensions(),
    });

    editor.commands.insertColumns({ layout: "two_equal" });
    const insertedTable = editor.commands.insertTable({ cols: 2, rows: 2 });
    expect(insertedTable).toBe(true);
    expect(editor.isActive("table")).toBe(true);
  });

  it("allows columns to be nested inside another column", () => {
    const editor = new Editor({
      extensions: getEditorExtensions(),
    });

    editor.commands.insertColumns({ layout: "two_equal" });
    expect(editor.isActive("columns")).toBe(true);

    const insertedNested = editor.commands.insertColumns({ layout: "two_equal" });
    expect(insertedNested).toBe(true);
  });
});
