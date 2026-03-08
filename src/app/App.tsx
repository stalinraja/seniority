import { useEffect, useState } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { Toaster } from "./components/ui/sonner";
import { initTheme } from "../../packages/ui-theme/src/theme-manager";
import { LanguageProvider } from "./i18n/language";

export default function App() {
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    initTheme();
    setThemeReady(true);
  }, []);

  return (
    <div className={`min-h-screen overflow-x-hidden app-shell ${themeReady ? "theme-ready" : ""}`}>
      <div className="app-orb app-orb--a" aria-hidden="true" />
      <div className="app-orb app-orb--b" aria-hidden="true" />
      <div className="app-grid" aria-hidden="true" />
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.06] hidden md:flex items-center justify-center"
      >
        <svg width="180" height="180" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="#7dd3fc" />
          <rect x="21" y="10" width="6" height="28" rx="3" fill="#0ea5e9" />
          <rect x="10" y="21" width="28" height="6" rx="3" fill="#0ea5e9" />
        </svg>
      </div>
      <div className="relative z-10">
        <LanguageProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" />
        </LanguageProvider>
      </div>
    </div>
  );
}
