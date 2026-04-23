// Theme system: dark | light. Persisted to localStorage. Sets data-theme on
// <html> so a global stylesheet (in pages/_app.js) can map CSS variables.

const KEY = "_theme";
const DEFAULT = "dark";

export function getTheme() {
  if (typeof window === "undefined") return DEFAULT;
  try { return localStorage.getItem(KEY) || DEFAULT; } catch { return DEFAULT; }
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  // Tell Electron (if running) so the native window chrome matches.
  try { if (typeof window !== "undefined" && window.electronAPI?.setNativeTheme) window.electronAPI.setNativeTheme(t); } catch { /* ignore */ }
}

export function setTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  if (typeof window === "undefined") return t;
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  applyTheme(t);
  window.dispatchEvent(new CustomEvent("theme:changed", { detail: t }));
  return t;
}

export function toggleTheme() {
  return setTheme(getTheme() === "dark" ? "light" : "dark");
}

import { useEffect, useState } from "react";

export function useTheme() {
  const [theme, setLocal] = useState(DEFAULT);
  useEffect(() => {
    setLocal(getTheme());
    applyTheme(getTheme());
    const onChange = (e) => setLocal(e?.detail || getTheme());
    window.addEventListener("theme:changed", onChange);
    return () => window.removeEventListener("theme:changed", onChange);
  }, []);
  return [theme, (t) => setTheme(t)];
}
