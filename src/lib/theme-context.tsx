"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyThemeToRoot,
  DEFAULT_THEME_ID,
  getTheme,
  isValidThemeId,
  THEME_PRESETS,
  type ThemeId,
  type ThemePreset,
} from "@/lib/themes";

/* ================================================================== */
/*  ThemeProvider — Next.js client-side theme switcher                  */
/*                                                                      */
/*  - Reads `initialThemeId` (from server/cookie) on first mount        */
/*  - Persists selection in localStorage under "linex-theme"            */
/*  - Syncs CSS variables to :root on every change                      */
/* ================================================================== */

interface ThemeContextValue {
  themes: ThemePreset[];
  activeTheme: ThemePreset;
  activeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "linex-theme";

export function ThemeProvider({
  children,
  initialThemeId,
}: {
  children: ReactNode;
  /** Server-side theme seed (e.g. from cookie or shop settings). */
  initialThemeId?: ThemeId;
}) {
  const [activeId, setActiveId] = useState<ThemeId>(
    initialThemeId && isValidThemeId(initialThemeId) ? initialThemeId : DEFAULT_THEME_ID
  );
  const cycleIndexRef = useRef(0);

  // Read persisted theme on first client mount (overrides server seed if present).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isValidThemeId(saved) && saved !== activeId) {
      setActiveId(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTheme = useMemo(() => getTheme(activeId), [activeId]);

  // Sync CSS vars whenever active theme changes.
  useEffect(() => {
    applyThemeToRoot(activeTheme);
  }, [activeTheme]);

  const setTheme = useCallback((id: ThemeId) => {
    if (!isValidThemeId(id)) return;
    setActiveId(id);
    cycleIndexRef.current = THEME_PRESETS.findIndex((t) => t.id === id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const cycleTheme = useCallback(() => {
    cycleIndexRef.current = (cycleIndexRef.current + 1) % THEME_PRESETS.length;
    const next = THEME_PRESETS[cycleIndexRef.current];
    setTheme(next.id);
  }, [setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themes: THEME_PRESETS,
      activeTheme,
      activeId,
      setTheme,
      cycleTheme,
    }),
    [activeTheme, activeId, setTheme, cycleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}

/** Safe variant for components that may render outside the provider. */
export function useThemeOptional(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
