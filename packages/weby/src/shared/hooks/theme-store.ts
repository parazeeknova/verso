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
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
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
          // no stored preference: default to system, but keep whatever theme the
          // pre-hydration script (or the desktop shell) already applied to the DOM
          const current =
            typeof document === "undefined" ? null : document.documentElement.dataset.theme;
          const resolved = current === "light" || current === "dark" ? current : getSystemTheme();
          applyDOM(resolved);
          set({ hydrated: true, preference: "system", resolved });
        }
      },
      hydrated: false,
      preference: "system",
      resolved: "dark",
      setPreference: (preference: ThemePreference) => {
        const resolved = resolvePreference(preference);
        applyDOM(resolved);
        set({ preference, resolved });
      },
      toggle: () => {
        const { resolved } = get();
        const nextResolved = resolved === "dark" ? "light" : "dark";
        applyDOM(nextResolved);
        set({ preference: nextResolved, resolved: nextResolved });
      },
    }),
    {
      name: "verso-theme",
      partialize: (state) => ({ preference: state.preference }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Once the desktop shell provides a theme via `verso:os-theme`, it is treated
// as authoritative: matchMedia changes (unreliable on some Linux webviews) no
// longer override it. The OS listener keeps applying later shell events.
let osThemeAuthoritative = false;

const setupSystemThemeListener = () => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return;
  }
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    if (osThemeAuthoritative) {
      return;
    }
    const state = useThemeStore.getState();
    if (state.preference !== "system") {
      return;
    }
    const resolved = mql.matches ? "dark" : "light";
    if (state.resolved !== resolved) {
      applyDOM(resolved);
      useThemeStore.setState({ resolved });
    }
  };
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", handler);
  }
};

// The desktop shell (Electrobun) forwards the OS theme via this event so Linux
// webviews (where matchMedia can be unreliable) still follow the system theme.
// Only applied while the preference is "system", so manual choices are kept.
const setupOsThemeListener = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.addEventListener("verso:os-theme", (event) => {
    // A saved explicit preference may not be restored into state yet: the shell
    // can dispatch this before hydration runs, when preference is still the
    // initial "system". The pre-hydration script already applied the saved
    // theme, so defer to it and avoid a flash; hydration restores state.
    const stored = readStoredPreference();
    if (stored === "light" || stored === "dark") {
      return;
    }
    const state = useThemeStore.getState();
    if (state.preference !== "system") {
      return;
    }
    const resolved = (event as CustomEvent<string>).detail === "dark" ? "dark" : "light";
    osThemeAuthoritative = true;
    if (state.resolved !== resolved) {
      applyDOM(resolved);
      useThemeStore.setState({ resolved });
    }
  });
};

setupSystemThemeListener();
setupOsThemeListener();
