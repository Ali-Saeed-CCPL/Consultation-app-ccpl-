import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

/** Light / dark switch - remembered per browser (src/lib/theme.ts). */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--hair)] transition-colors"
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
