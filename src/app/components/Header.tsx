import { Link, useLocation } from "react-router";
import { FileDown, Languages, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getThemeMode, toggleThemeMode, type ThemeMode } from "../../../packages/ui-theme/src/theme-manager";
import {
  APPLY_SECTION_ENABLED,
  LANGUAGE_SWITCH_ENABLED,
} from "../config/features";
import { useLanguage } from "../i18n/language";

export function Header() {
  const location = useLocation();
  const showApplyButton = APPLY_SECTION_ENABLED && location.pathname !== "/apply";
  const [theme, setTheme] = useState<ThemeMode>("light");
  const { language, toggleLanguage, t } = useLanguage();

  useEffect(() => {
    setTheme(getThemeMode());
  }, []);

  const toggleTheme = () => {
    const next = toggleThemeMode();
    setTheme(next);
  };

  return (
    <header className="glass-header sticky top-0 z-50">
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/80 rounded-lg flex items-center justify-center shrink-0 ring-1 ring-slate-200/80 overflow-hidden">
              <img
                src="/diocese-logo.png"
                alt="CSI Thoothukudi Nazareth Diocese logo"
                className="w-full h-full object-contain p-1"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-xl font-semibold text-gray-900 truncate">
                CSI Thoothukudi Nazareth Diocese
              </h1>
              <p className="text-xs sm:text-sm text-gray-600">
                {t("Candidate Seniority Portal - 2026", "விண்ணப்பதாரர் மூப்பு தளம் - 2026")}
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={toggleTheme}
              className="glass-toggle px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base inline-flex items-center gap-1 sm:gap-2 w-fit sm:w-auto"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              <span>{theme === "dark" ? t("Light", "ஒளி") : t("Dark", "இருள்")}</span>
            </button>

            {LANGUAGE_SWITCH_ENABLED ? (
              <button
                onClick={toggleLanguage}
                className="glass-toggle px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base inline-flex items-center gap-1 sm:gap-2 w-fit sm:w-auto"
                aria-label="Toggle language"
              >
                <Languages className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{language === "en" ? "தமிழ்" : "English"}</span>
              </button>
            ) : null}

            {showApplyButton ? (
              <Link
                to="/apply"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base shadow transition-all duration-200 inline-flex items-center gap-1 sm:gap-2 w-fit sm:w-auto"
              >
                <FileDown className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{t("Apply Now", "இப்போது விண்ணப்பிக்க")}</span>
                <span className="sm:hidden">{t("Apply", "விண்ணப்பம்")}</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
