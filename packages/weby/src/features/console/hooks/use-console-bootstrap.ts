import { useEffect } from "react";
import { useWorkspaces } from "#/features/console/hooks/use-workspaces";
import { useSpaces } from "#/features/console/hooks/use-spaces";
import { useConsoleStore } from "#/features/console/stores/console-store";

export const useConsoleBootstrap = () => {
  const {
    selectedWorkspaceId,
    selectedSpaceId,
    bootstrapped,
    setSelectedWorkspaceId,
    setSelectedSpaceId,
    setBootstrapped,
  } = useConsoleStore();

  const { data: workspaces, isPending: workspacesPending } = useWorkspaces();
  const { data: spaces } = useSpaces(selectedWorkspaceId);

  useEffect(() => {
    if (workspacesPending || !workspaces) {
      return;
    }

    if (selectedWorkspaceId) {
      const stillExists = workspaces.some((w) => w.id === selectedWorkspaceId);
      if (stillExists) {
        if (!bootstrapped) {
          setBootstrapped(true);
        }
        return;
      }
    }

    const [firstWorkspace] = workspaces;
    if (firstWorkspace) {
      setSelectedWorkspaceId(firstWorkspace.id);
    } else if (selectedWorkspaceId) {
      setSelectedWorkspaceId("");
    }

    if (!bootstrapped) {
      setBootstrapped(true);
    }
  }, [
    workspaces,
    workspacesPending,
    selectedWorkspaceId,
    bootstrapped,
    setSelectedWorkspaceId,
    setBootstrapped,
  ]);

  useEffect(() => {
    if (!spaces || !selectedWorkspaceId) {
      return;
    }

    const activeSpaces = spaces.filter((s) => s.slug !== "nospace");

    if (activeSpaces.length === 0) {
      if (selectedSpaceId !== "") {
        setSelectedSpaceId("");
      }
      return;
    }

    if (selectedSpaceId) {
      const stillExists = spaces.some((s) => s.id === selectedSpaceId);
      if (stillExists) {
        return;
      }
    }

    setSelectedSpaceId(activeSpaces[0].id);
  }, [spaces, selectedSpaceId, selectedWorkspaceId, setSelectedSpaceId]);

  return {
    bootstrapped: bootstrapped && !workspacesPending && !!workspaces,
    currentWorkspace: workspaces?.find((w) => w.id === selectedWorkspaceId),
    spaces: spaces ?? [],
    workspaces: workspaces ?? [],
  };
};
