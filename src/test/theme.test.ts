import { afterEach, describe, expect, it } from "vitest";

import { getStoredTheme, storeTheme, themeInitScript } from "@/lib/theme";

const mockSystemDark = (dark: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: dark && query.includes("dark"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
};
const runInitScript = () => new Function(themeInitScript)();

describe("theme", () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    mockSystemDark(false);
  });

  it("follows the system setting when nothing is saved", () => {
    mockSystemDark(true);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
  it("lets a saved choice override the system setting", () => {
    mockSystemDark(true);
    storeTheme("light");
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    storeTheme("dark");
    mockSystemDark(false);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
  it("ignores unexpected stored values", () => {
    localStorage.setItem("aangan-theme", "purple");
    expect(getStoredTheme()).toBeNull();
  });
});
