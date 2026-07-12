import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  preference: ThemePreference;
  resolved: "light" | "dark";
  hydrated: boolean;
}

interface ThemeActions {
  hydrate: () => void;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

const getSystemTheme = (): "light" | "dark" =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const resolvePreference = (pref: ThemePreference): "light" | "dark" =>
  pref === "system" ? getSystemTheme() : pref;

const applyDOM = (resolved: "light" | "dark") => {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.mantineColorScheme = resolved;
  }
};

const readStoredPreference = (): ThemePreference | null => {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem("verso-theme");
    if (raw) {
      const parsed = JSON.parse(raw);
      const p = parsed?.state?.preference;
      if (p === "light" || p === "dark" || p === "system") {
        return p;
      }
    }
  } catch {
    // corrupted
  }
  const legacy = localStorage.getItem("theme-preference");
  if (legacy === "light" || legacy === "dark" || legacy === "system") {
    return legacy;
  }
  const older = localStorage.getItem("theme");
  if (older === "light" || older === "dark") {
    return older;
  }
  return null;
};

export const useThemeStore = create<ThemeState & ThemeActions>()(
  persist(
    (set, get) => ({
      hydrate: () => {
        if (get().hydrated) {
          return;
        }
        const stored = readStoredPreference();
        if (stored) {
          const resolved = resolvePreference(stored);
          applyDOM(resolved);
          set({ hydrated: true, preference: stored, resolved });
        } else {
          set({ hydrated: true });
        }
      },
      hydrated: false,
      preference: "dark",
      resolved: "dark",
      setPreference: (preference: ThemePreference) => {
        const resolved = resolvePreference(preference);
        applyDOM(resolved);
        set({ preference, resolved });
      },
      toggle: () => {
        const { preference, resolved } = get();
        const nextResolved = resolved === "dark" ? "light" : "dark";
        applyDOM(nextResolved);
        if (preference === "system") {
          set({ resolved: nextResolved });
        } else {
          set({ preference: nextResolved, resolved: nextResolved });
        }
      },
    }),
    {
      name: "verso-theme",
      partialize: (state) => ({ preference: state.preference }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
