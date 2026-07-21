import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const safeStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* unavailable */
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* unavailable */
    }
  },
};

interface ConsoleState {
  sidebarOpen: boolean;
  selectedWorkspaceId: string;
  selectedSpaceId: string;
  selectedPageId: string | null;
  bootstrapped: boolean;
}

interface ConsoleActions {
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
  setSelectedWorkspaceId: (id: string) => void;
  setSelectedSpaceId: (id: string) => void;
  setSelectedPageId: (id: string | null) => void;
  setBootstrapped: (v: boolean) => void;
  reset: () => void;
}

const initialState: ConsoleState = {
  bootstrapped: false,
  selectedPageId: null,
  selectedSpaceId: "",
  selectedWorkspaceId: "",
  sidebarOpen: true,
};

const getInitialSidebarOpen = (): boolean => {
  if (typeof window === "undefined") {
    return true;
  }
  if (window.innerWidth < 768) {
    return false;
  }
  try {
    const stored = localStorage.getItem("verso-console-store");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.state?.sidebarOpen === "boolean") {
          return parsed.state.sidebarOpen;
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* localStorage unavailable */
  }
  return true;
};

export const useConsoleStore = create<ConsoleState & ConsoleActions>()(
  persist(
    (set) => ({
      ...initialState,
      reset: () => set(initialState),
      setBootstrapped: (v: boolean) => set({ bootstrapped: v }),
      setSelectedPageId: (id: string | null) => set({ selectedPageId: id }),
      setSelectedSpaceId: (id: string) => set({ selectedSpaceId: id }),
      setSelectedWorkspaceId: (id: string) => set({ selectedWorkspaceId: id }),
      setSidebarOpen: (v: boolean) => set({ sidebarOpen: v }),
      sidebarOpen: getInitialSidebarOpen(),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: "verso-console-store",
      partialize: (state) => ({
        selectedSpaceId: state.selectedSpaceId,
        selectedWorkspaceId: state.selectedWorkspaceId,
        sidebarOpen: state.sidebarOpen,
      }),
      storage: createJSONStorage(() => safeStorage),
    },
  ),
);
