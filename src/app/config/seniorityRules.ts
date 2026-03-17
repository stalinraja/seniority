import { ELEMENTARY_TET_PASS_MARK, HIGH_SCHOOL_TET_PASS_MARK } from "./features";

export const SENIORITY_RULES = {
  highSchool: {
    pgTieBreakOrder: ["yearOfRegistering", "yearOfPassing", "dateOfBirth"] as const,
    ug: {
      prioritizeTetCandidates: true,
      tetTieBreakOrder: ["yearOfRegistering", "yearOfPassing", "dateOfBirth", "tetScore"] as const,
      nonTetTieBreakOrder: ["yearOfRegistering", "yearOfPassing", "dateOfBirth"] as const,
    },
  },
  elementarySchool: {
    tetQualifiedThreshold: ELEMENTARY_TET_PASS_MARK,
    tieBreakOrder: ["yearOfRegistering", "yearOfPassing", "dateOfBirth", "tetCompletion"] as const,
  },
  clergyOrdination: {
    tieBreakOrder: ["yearOfPassing", "yearsOfExperience", "dateOfBirth"] as const,
  },
};

function getPassingYear(value: any, extractPassingYear: (v: any) => number | null) {
  return extractPassingYear(value) ?? Number.MAX_SAFE_INTEGER;
}

function getPassingMonth(value: any) {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const match = raw.match(/[A-Za-z]{3,9}/);
  if (!match) return null;
  const token = match[0].replace(/\./g, "").toLowerCase().slice(0, 3);
  const months: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  };
  return Object.prototype.hasOwnProperty.call(months, token) ? months[token] : null;
}

function getDateSortValue(value: any) {
  return value instanceof Date ? value.getTime() : Number.MAX_SAFE_INTEGER;
}

function hasTetData(candidate: any) {
  if (!Number.isFinite(candidate.tetScore)) return false;
  const score = Number(candidate.tetScore);
  if (score < HIGH_SCHOOL_TET_PASS_MARK) return false;
  if (candidate.tetQualified === false) return false;
  return true;
}

function compareByRule(
  a: any,
  b: any,
  rule:
    | "yearOfRegistering"
    | "yearOfPassing"
    | "dateOfBirth"
    | "tetYear"
    | "tetScore"
    | "tetCompletion"
    | "yearsOfExperience",
  extractPassingYear: (v: any) => number | null
) {
  if (rule === "yearOfRegistering") {
    return Number(a.yearOfRegistering ?? Number.MAX_SAFE_INTEGER) - Number(b.yearOfRegistering ?? Number.MAX_SAFE_INTEGER);
  }
  if (rule === "yearOfPassing") {
    const aYear = getPassingYear(a.yearOfPassing, extractPassingYear);
    const bYear = getPassingYear(b.yearOfPassing, extractPassingYear);
    if (aYear !== bYear) return aYear - bYear;

    const aMonth = getPassingMonth(a.yearOfPassing);
    const bMonth = getPassingMonth(b.yearOfPassing);
    if (aMonth !== null || bMonth !== null) {
      const am = aMonth ?? Number.MAX_SAFE_INTEGER;
      const bm = bMonth ?? Number.MAX_SAFE_INTEGER;
      if (am !== bm) return am - bm;
    }

    return 0;
  }
  if (rule === "tetYear") {
    const aTetYear = Number.isFinite(a.tetYear) ? Number(a.tetYear) : Number.MAX_SAFE_INTEGER;
    const bTetYear = Number.isFinite(b.tetYear) ? Number(b.tetYear) : Number.MAX_SAFE_INTEGER;
    return aTetYear - bTetYear;
  }
  if (rule === "tetScore") {
    const aScore = Number.isFinite(a.tetScore) ? Number(a.tetScore) : -1;
    const bScore = Number.isFinite(b.tetScore) ? Number(b.tetScore) : -1;
    return bScore - aScore;
  }
  if (rule === "tetCompletion") {
    const aScore = Number.isFinite(a.tetCompletion) ? Number(a.tetCompletion) : -1;
    const bScore = Number.isFinite(b.tetCompletion) ? Number(b.tetCompletion) : -1;
    return bScore - aScore;
  }
  if (rule === "yearsOfExperience") {
    const aExp = Number.isFinite(a.yearsOfExperience) ? Number(a.yearsOfExperience) : Number.MIN_SAFE_INTEGER;
    const bExp = Number.isFinite(b.yearsOfExperience) ? Number(b.yearsOfExperience) : Number.MIN_SAFE_INTEGER;
    return bExp - aExp;
  }
  return getDateSortValue(a.dateOfBirth) - getDateSortValue(b.dateOfBirth);
}

export function compareHighSchoolCandidates(
  a: any,
  b: any,
  extractPassingYear: (v: any) => number | null
) {
  const aIsUg = String(a.category || "").toUpperCase().includes("UG");
  const bIsUg = String(b.category || "").toUpperCase().includes("UG");
  const aIsPg = String(a.category || "").toUpperCase().includes("PG");
  const bIsPg = String(b.category || "").toUpperCase().includes("PG");

  if (aIsPg && bIsPg) {
    for (const rule of SENIORITY_RULES.highSchool.pgTieBreakOrder) {
      const diff = compareByRule(a, b, rule, extractPassingYear);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  if (aIsUg && bIsUg) {
    const aHasTet = hasTetData(a);
    const bHasTet = hasTetData(b);
    if (SENIORITY_RULES.highSchool.ug.prioritizeTetCandidates && aHasTet !== bHasTet) {
      return aHasTet ? -1 : 1;
    }

    const activeOrder = aHasTet && bHasTet
      ? SENIORITY_RULES.highSchool.ug.tetTieBreakOrder
      : SENIORITY_RULES.highSchool.ug.nonTetTieBreakOrder;
    for (const rule of activeOrder) {
      const diff = compareByRule(a, b, rule, extractPassingYear);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  // Cross-category fallback order for stable sorting.
  for (const rule of SENIORITY_RULES.highSchool.pgTieBreakOrder) {
    const diff = compareByRule(a, b, rule, extractPassingYear);
    if (diff !== 0) return diff;
  }

  return 0;
}


export function compareHighSchoolSeniorityCandidates(
  a: any,
  b: any,
  extractPassingYear: (v: any) => number | null
) {
  const order: Array<
    "yearOfRegistering" | "yearOfPassing" | "dateOfBirth" | "tetScore"
  > = ["yearOfRegistering", "yearOfPassing", "dateOfBirth", "tetScore"];

  for (const rule of order) {
    const diff = compareByRule(a, b, rule, extractPassingYear);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function compareElementarySchoolCandidates(
  a: any,
  b: any,
  extractPassingYear: (v: any) => number | null
) {
  const aPriority = Number(a.tetCompletion) >= SENIORITY_RULES.elementarySchool.tetQualifiedThreshold ? 1 : 0;
  const bPriority = Number(b.tetCompletion) >= SENIORITY_RULES.elementarySchool.tetQualifiedThreshold ? 1 : 0;
  if (aPriority !== bPriority) return bPriority - aPriority;

  for (const rule of SENIORITY_RULES.elementarySchool.tieBreakOrder) {
    const diff = compareByRule(a, b, rule, extractPassingYear);
    if (diff !== 0) return diff;
  }

  return 0;
}


export function compareElementarySchoolSeniorityCandidates(
  a: any,
  b: any,
  extractPassingYear: (v: any) => number | null
) {
  const order: Array<
    "yearOfRegistering" | "yearOfPassing" | "dateOfBirth" | "tetCompletion"
  > = ["yearOfRegistering", "yearOfPassing", "dateOfBirth", "tetCompletion"];

  for (const rule of order) {
    const diff = compareByRule(a, b, rule, extractPassingYear);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function compareClergyOrdinationCandidates(
  a: any,
  b: any,
  extractPassingYear: (v: any) => number | null
) {
  for (const rule of SENIORITY_RULES.clergyOrdination.tieBreakOrder) {
    const diff = compareByRule(a, b, rule, extractPassingYear);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function getRankingRulesDisplay(language: "en" | "ta" = "en") {
  const high =
    language === "ta"
      ? [
          "இது முதுகலை (PG) மற்றும் இளங்கலை (UG) என இரண்டு பிரிவுகளுக்கும் பொருந்தும். இளங்கலை ஆசிரியர்களுக்கு TET தேர்ச்சி கட்டாயம்.",
          "மூப்பு வரிசை: பதிவு செய்த தேதி முதலில்.",
          "ஒரே ஆண்டில் பதிவு செய்திருந்தால், முதலில் தேர்ச்சி பெற்றவர் (மாதம்/ஆண்டு) முன்னுரிமை.",
          "இன்னும் சமமானால், வயதில் மூத்தவர் முன்னுரிமை.",
          "இன்னும் சமமானால், TET மதிப்பெண் அதிகம் பெற்றவர் முன்னுரிமை.",
          "நியமன முன்னுரிமை: TET தேர்ச்சி பெற்றவர்கள் முதலில்.",
          "TET தேர்ச்சி பெற்றவர்கள் பலரானால், மேற்கண்ட மூப்பு வரிசை பயன்படுத்தப்படும்.",
        ]
      : [
          "Applies to both PG and UG categories. For UG candidates, TET qualification is mandatory.",
          "Seniority order: earlier registration date/year comes first.",
          "If registration year is the same, earlier passing month/year comes first.",
          "If still tied, older age comes first.",
          "If still tied, higher TET score comes first.",
          "Appointment priority: TET‑qualified candidates always come first.",
          "If multiple TET‑qualified, the same seniority order is used.",
        ];

  const elementary =
    language === "ta"
      ? [
          "இந்த தரவரிசைப் பட்டியல் பாஸ்டரேட் (Pastorate) அளவில் பராமரிக்கப்படுகிறது.",
          "பாஸ்டரேட் காலியிடங்களுக்கு பாஸ்டரேட் தரவரிசை பயன்படுத்தப்படும்.",
          "கவுன்சில் தரவரிசை அனைத்து பாஸ்டரேட்களின் கூட்டுத் தரவரிசையாகவும், மறைமாவட்ட தரவரிசை அனைத்து கவுன்சில்களின் கூட்டுத் தரவரிசையாகவும் அமையும்.",
          "மூப்பு வரிசை: பதிவு செய்த தேதி முதலில்.",
          "ஒரே ஆண்டில் பதிவு செய்திருந்தால், முதலில் தேர்ச்சி பெற்றவர் (மாதம்/ஆண்டு) முன்னுரிமை.",
          "இன்னும் சமமானால், வயதில் மூத்தவர் முன்னுரிமை.",
          "இன்னும் சமமானால், TET மதிப்பெண் அதிகம் பெற்றவர் முன்னுரிமை.",
          "நியமன முன்னுரிமை: TET தேர்ச்சி பெற்றவர்கள் முதலில்.",
          "TET தேர்ச்சி பெற்றவர்கள் பலரானால், மேற்கண்ட மூப்பு வரிசை பயன்படுத்தப்படும்.",
        ]
      : [
          "Rankings are maintained at the Pastorate level.",
          "Vacancies at a Pastorate use the Pastorate ranking.",
          "Council ranking is cumulative of all Pastorates; Diocese ranking is cumulative of all Councils.",
          "Seniority order: earlier registration date/year comes first.",
          "If registration year is the same, earlier passing month/year comes first.",
          "If still tied, older age comes first.",
          "If still tied, higher TET score comes first.",
          "Appointment priority: TET‑qualified candidates always come first.",
          "If multiple TET‑qualified, the same seniority order is used.",
        ];

  const clergy =
    language === "ta"
      ? [
          "நிலை 1: முதலில் Ordination (Year of Passing) பெற்றவர் முன்னுரிமை.",
          "ஒரே ஆண்டு என்றால், மாதம் இருந்தால் அதற்கு முன்னுரிமை.",
          "நிலை 2: அதிக ஆண்டுகள் பணி அனுபவம் உள்ளவர் முன்னுரிமை.",
          "நிலை 3: வயதில் மூத்தவர் முன்னுரிமை.",
        ]
      : [
          "Priority 1: Earlier Year of Ordination (Year of Passing).",
          "If the year is the same, earlier month gets priority when available.",
          "Priority 2: Higher Years of Experience.",
          "Priority 3: Older Age (Date of Birth).",
        ];

  return { high, elementary, clergy };
}
