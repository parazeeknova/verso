export interface SharedEditorStorage {
  shared?: {
    pageId?: string;
    spaceName?: string;
    pageName?: string;
    imagePreviews?: Record<string, string | undefined>;
  };
}
