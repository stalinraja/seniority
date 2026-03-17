import { getRankingRulesDisplay } from "../config/seniorityRules";
import { useLanguage } from "../i18n/language";
import {
  CLERGY_SECTION_ENABLED,
  HIGH_SCHOOL_SECTION_ENABLED,
  MIDDLE_SCHOOL_SECTION_ENABLED,
} from "../config/features";

export function AppGuidelines() {
  const { language, t } = useLanguage();
  const rankingRules = getRankingRulesDisplay(language);

  return (
    <footer className="rules-footer glass-panel border-t border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 text-sm text-gray-700">
        <h3 className="font-semibold text-gray-900 mb-2">{t("Navigation Rules", "வழிசெலுத்தல் விதிகள்")}</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            {t(
              "Choose the priority type (High/Higher Secondary School or Elementry/Middle School) from the top selector.",
              "மேலுள்ள தேர்வில் இருந்து மூப்பு வகையை (உயர்நிலை/மேல்நிலை அல்லது தொடக்க/நடுநிலை) தேர்வு செய்யவும்."
            )}
          </li>
          <li>{t("Use Filters to narrow the list, Search to find candidates quickly, and Sort By to switch between Seniority and Appointment views.", "பட்டியலை குறைக்க வடிகட்டிகளை பயன்படுத்தவும்; விண்ணப்பதாரரை விரைவாக கண்டுபிடிக்க தேடலை பயன்படுத்தவும்; மூப்பு மற்றும் நியமன பார்வையை மாற்ற Sort By பயன்படுத்தவும்.")}</li>
          <li>{t("Use Dashboard for visual summary and Download PDF for reports.", "காட்சி சுருக்கத்திற்கு டாஷ்போர்டை பயன்படுத்தவும்; அறிக்கைக்கு PDF பதிவிறக்கம் செய்யவும்.")}</li>
          <li>{t("Use Apply page to download the required school application form and view vacancies.", "தேவையான பள்ளி விண்ணப்பப் படிவத்தை பதிவிறக்கம் செய்யவும்; காலிப்பணியிடங்களை பார்க்கவும் விண்ணப்பப் பக்கத்தை பயன்படுத்தவும்.")}</li>
        </ol>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
          {HIGH_SCHOOL_SECTION_ENABLED ? (
            <div className="rules-card rounded-lg border border-gray-200 p-3">
              <h4 className="font-semibold text-gray-900 mb-2">
                {t("High/Higher Secondary Ranking Rules", "உயர்நிலை/மேல்நிலை மூப்பு விதிகள்")}
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                {rankingRules.high.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {MIDDLE_SCHOOL_SECTION_ENABLED ? (
            <div className="rules-card rounded-lg border border-gray-200 p-3">
              <h4 className="font-semibold text-gray-900 mb-2">
                {t("Elementry/Middle Ranking Rules", "தொடக்க/நடுநிலை மூப்பு விதிகள்")}
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                {rankingRules.elementary.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {CLERGY_SECTION_ENABLED ? (
            <div className="rules-card rounded-lg border border-gray-200 p-3">
              <h4 className="font-semibold text-gray-900 mb-2">
                {t("Clergy Ordination Ranking Rules", "குருத்துவ அர்ப்பணிப்பு மூப்பு விதிகள்")}
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                {rankingRules.clergy.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <p className="mt-3 text-gray-800">
          {t(
            "If you find any errors or mistakes in the list, please contact your Pastorate Chairman through letter, and it will be forwarded to the concerned departments.",
            "பட்டியலில் பிழைகள் இருந்தால், உங்கள் பாஸ்டரேட் தலைவர் மூலம் கடிதமாக தெரிவிக்கவும். அது தொடர்புடைய துறைகளுக்கு அனுப்பப்படும்."
          )}
        </p>
      </div>
    </footer>
  );
}
