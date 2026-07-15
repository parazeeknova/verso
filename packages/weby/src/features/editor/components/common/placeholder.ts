import type { Node as ProsemirrorNode } from "@tiptap/pm/model";

export interface PlaceholderNodeResult {
  node: ProsemirrorNode;
  pos: number;
}

// Finds the first node of `nodeType` whose placeholder id matches `placeholderId`.
export const findNodeByPlaceholderId = (
  doc: ProsemirrorNode,
  nodeType: string,
  placeholderId: string,
): PlaceholderNodeResult | null => {
  let result: PlaceholderNodeResult | null = null;
  doc.descendants((node: ProsemirrorNode, pos: number) => {
    if (result) {
      return false;
    }
    if (node.type.name === nodeType && node.attrs.placeholder?.id === placeholderId) {
      result = { node, pos };
      return false;
    }
    return true;
  });
  return result;
};
