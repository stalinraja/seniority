export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "theme-mode";
const THEME_EVENT = "themechange";

function prefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") return saved;
  return "light";
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.dataset.theme = mode;
}

export function initTheme(): ThemeMode {
  const mode = resolveInitialTheme();
  applyTheme(mode);
  return mode;
}

export function getThemeMode(): ThemeMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setThemeMode(mode: ThemeMode): ThemeMode {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, mode);
  }
  applyTheme(mode);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(THEME_EVENT));
  }
  return mode;
}

export function toggleThemeMode(): ThemeMode {
  return setThemeMode(getThemeMode() === "dark" ? "light" : "dark");
}

export function onThemeChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(THEME_EVENT, listener);
  return () => window.removeEventListener(THEME_EVENT, listener);
}
