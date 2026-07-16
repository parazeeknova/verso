import type { Node as ProsemirrorNode } from "@tiptap/pm/model";

export interface PlaceholderNodeResult {
  node: ProsemirrorNode;
  pos: number;
}

class SentinelFound {
  result: PlaceholderNodeResult;
  constructor(result: PlaceholderNodeResult) {
    this.result = result;
  }
}

// Finds the first node of `nodeType` whose placeholder id matches `placeholderId`.
export const findNodeByPlaceholderId = (
  doc: ProsemirrorNode,
  nodeType: string,
  placeholderId: string,
): PlaceholderNodeResult | null => {
  try {
    doc.descendants((node: ProsemirrorNode, pos: number) => {
      if (node.type.name === nodeType && node.attrs.placeholder?.id === placeholderId) {
        throw new SentinelFound({ node, pos });
      }
      return true;
    });
  } catch (error) {
    if (error instanceof SentinelFound) {
      return error.result;
    }
    throw error;
  }
  return null;
};
