import { useRef, useCallback, useState, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { useUpdatePage } from "#/features/console/hooks/use-pages";

export const useEditorContent = (
  editor: Editor | null,
  pageId: string,
  options?: { enabled?: boolean },
) => {
  const updatePage = useUpdatePage();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFlushRef = useRef(false);
  const dirtyRef = useRef(false);
  const lastSavedJsonRef = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Keep latest refs to prevent callback recreate loops
  const stateRef = useRef({ editor, options, pageId, updatePage });
  useEffect(() => {
    stateRef.current = { editor, options, pageId, updatePage };
  }, [editor, pageId, options, updatePage]);

  const flush = useCallback(() => {
    const {
      editor: currentEditor,
      pageId: currentId,
      options: currentOpts,
      updatePage: currentUpdate,
    } = stateRef.current;

    if (!currentEditor || !dirtyRef.current || currentOpts?.enabled === false) {
      return;
    }
    const json = currentEditor.getJSON();
    const jsonStr = JSON.stringify(json);
    if (lastSavedJsonRef.current === jsonStr) {
      dirtyRef.current = false;
      setDirty(false);
      return;
    }
    if (currentUpdate.isPending) {
      pendingFlushRef.current = true;
      return;
    }
    pendingFlushRef.current = false;
    const text = currentEditor.getText();
    currentUpdate.mutate(
      {
        id: currentId,
        input: {
          contentJson: jsonStr,
          textContent: text,
        },
      },
      {
        onSuccess: () => {
          lastSavedJsonRef.current = jsonStr;
          dirtyRef.current = false;
          setDirty(false);
          setLastSaved(new Date());
        },
      },
    );
  }, []);

  const { isPending } = updatePage;
  useEffect(() => {
    if (!isPending && pendingFlushRef.current) {
      flush();
    }
  }, [isPending, flush]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setDirty(true);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      flush();
    }, 1500);
  }, [flush]);

  const cleanup = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const resetDirty = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    pendingFlushRef.current = false;
    dirtyRef.current = false;
    lastSavedJsonRef.current = null;
    setDirty(false);
  }, []);

  return {
    cleanup,
    dirty,
    flush,
    isSaving: updatePage.isPending,
    lastSaved,
    markDirty,
    resetDirty,
  };
};
