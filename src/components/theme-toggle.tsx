import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyTheme, getStoredTheme, storeTheme, systemPrefersDark } from "@/lib/theme";

export function ThemeToggle() {
  // Unknown during server render; the icons switch via the `dark:` variant, so markup matches.
  const [dark, setDark] = useState<boolean>();

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    // Keep following the system setting until the visitor picks a theme here.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getStoredTheme()) return;
      applyTheme(systemPrefersDark() ? "dark" : "light");
      setDark(systemPrefersDark());
    };
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  const toggle = () => {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
    storeTheme(next);
    setDark(next === "dark");
  };

  return (
    <Button variant="ghost" size="icon" aria-label="Dark mode" aria-pressed={dark} onClick={toggle}>
      <Moon className="dark:hidden" />
      <Sun className="hidden dark:block" />
    </Button>
  );
}
