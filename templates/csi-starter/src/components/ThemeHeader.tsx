import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getThemeMode, toggleThemeMode, type ThemeMode } from "../../../../packages/ui-theme/src/theme-manager";

export function ThemeHeader() {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    setTheme(getThemeMode());
  }, []);

  const onToggle = () => {
    const next = toggleThemeMode();
    setTheme(next);
  };

  return (
    <header className="glass-header sticky top-0 z-10">
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(14,165,233,0.85)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
              }}
            >
              CSI
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>CSI Starter</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>Shared UI Theme</div>
            </div>
          </div>
          <button className="glass-toggle" style={{ padding: "8px 12px", borderRadius: 10, display: "inline-flex", gap: 8 }} onClick={onToggle}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </div>
    </header>
  );
}
