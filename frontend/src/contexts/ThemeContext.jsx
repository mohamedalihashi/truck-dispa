import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "td_theme";
const MODES = new Set(["light", "dark", "system"]);

function readStoredMode() {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem(STORAGE_KEY);
  return MODES.has(stored) ? stored : "system";
}

function systemIsDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(dark, mode) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.dataset.theme = mode;
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readStoredMode);
  const [systemDark, setSystemDark] = useState(systemIsDark);
  const dark = mode === "dark" || (mode === "system" && systemDark);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (event) => setSystemDark(event.matches);
    setSystemDark(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useLayoutEffect(() => {
    applyTheme(dark, mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [dark, mode]);

  const value = useMemo(
    () => ({
      dark,
      mode,
      setMode,
      toggle: () => setMode(dark ? "light" : "dark")
    }),
    [dark, mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
