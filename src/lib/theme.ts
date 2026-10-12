export type Theme = "light" | "dark";

const STORAGE_KEY = "aangan-theme";

/** The visitor's saved choice, or null to follow the system setting. */
export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // Storage blocked (e.g. private mode): follow the system.
  }
}

export function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export const systemPrefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * Inlined into <head> so the right theme is set before first paint — without it,
 * dark-mode visitors would see a white flash while the page loads.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
