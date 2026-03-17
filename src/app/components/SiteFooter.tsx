import { useLanguage } from "../i18n/language";

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer site-footer--rich glass-panel border-t border-slate-200">
      <div className="site-footer__shine" aria-hidden="true" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 text-center text-sm">
        <p className="text-slate-700">
          {t(
            "All rights reserved to CSI Thoothukudi-Nazareth Diocese.",
            "அனைத்து உரிமைகளும் CSI தூத்துக்குடி நாசரேத் மறைமாவட்டத்திற்கு உடைமையாகும்."
          )}
        </p>
      </div>
    </footer>
  );
}
