import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useLanguage } from "../i18n/language";
import { NAVIGATION_TUTORIAL_ENABLED } from "../config/features";

const STORAGE_PREFIX = "seniority_navigation_tutorial_seen";

function getStorageKey(language: string) {
  return `${STORAGE_PREFIX}_${language}`;
}

export function NavigationTutorial() {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);

  const storageKey = useMemo(() => getStorageKey(language), [language]);

  useEffect(() => {
    if (!NAVIGATION_TUTORIAL_ENABLED) return;
    const seen = localStorage.getItem(storageKey) === "true";
    setOpen(!seen);
  }, [storageKey]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      localStorage.setItem(storageKey, "true");
    }
  };

  if (!NAVIGATION_TUTORIAL_ENABLED) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("Quick Navigation Guide", "விரைவு வழிசெலுத்தல் வழிகாட்டி")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            {t(
              "Use these steps to find the right list quickly.",
              "சரியான பட்டியலை விரைவில் கண்டுபிடிக்க கீழே உள்ள படிகளை பயன்படுத்தவும்."
            )}
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-slate-700">
            <li>
              {t(
                "Choose the section: High/Higher, Elementary, or Clergy.",
                "பிரிவை தேர்வு செய்யவும்: உயர்நிலை/மேல்நிலை, தொடக்க/நடுநிலை, அல்லது குருத்துவம்."
              )}
            </li>
            <li>
              {t(
                "Search by name, council, pastorate, or qualification.",
                "பெயர், கவுன்சில், பாஸ்டரேட், அல்லது தகுதியை வைத்து தேடுங்கள்."
              )}
            </li>
            <li>
              {t(
                "Use Filters to narrow results. Tap Clear All to reset.",
                "வடிகட்டிகளை பயன்படுத்தி முடிவுகளை குறைக்கவும். Clear All மூலம் மீண்டும் அமைக்கவும்."
              )}
            </li>
            <li>
              {t(
                "On mobile, swipe left or right to see more columns.",
                "மொபைலில், கூடுதல் நெடுவரிசைகளைப் பார்க்க இடது/வலது நோக்கி இழுக்கவும்."
              )}
            </li>
            <li>
              {t(
                "Use Next/Previous for pages and Download PDF when needed.",
                "பக்கங்களுக்கு Next/Previous பயன்படுத்தவும்; தேவையான போது PDF பதிவிறக்கம் செய்யவும்."
              )}
            </li>
          </ol>
        </div>
        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)}>
            {t("Got it", "புரிந்தது")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
