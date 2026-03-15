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
    return getPassingYear(a.yearOfPassing, extractPassingYear) - getPassingYear(b.yearOfPassing, extractPassingYear);
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
          "முதுகலை (PG): TET அவசியமில்லை. வேலைவாய்ப்பு அலுவலகத்தில் பதிவு செய்த ஆண்டு தான் முக்கியம். ஒரே ஆண்டில் பதிவு செய்திருந்தால், தேர்ச்சி பெற்ற ஆண்டு கணக்கிடப்படும். அதுவும் சமமாக இருந்தால், வயதில் மூத்தவருக்கு முன்னுரிமை வழங்கப்படும்.",
          `இளகலை (UG): TET கட்டாயம். TET தேர்ச்சி (${HIGH_SCHOOL_TET_PASS_MARK}+) பெற்றவர்கள் முதலில் வரிசைப்படுத்தப்படுவர்.`,
          "வரிசை முறை:",
          "முதலில் பதிவு செய்த ஆண்டு.",
          "முதலில் தேர்ச்சி பெற்ற ஆண்டு.",
          "அதிக வயது (பிறந்த தேதி அடிப்படையில்).",
          "TET தேர்வில் எடுத்த அதிக மதிப்பெண் (TET உள்ளவர்களுக்கு மட்டும்).",
        ]
      : [
          "For PG: TET is not required. The person who registered their degree first gets priority. If registration year is the same, the person who passed earlier gets priority. If still tied, the older person gets priority.",
          `For UG: TET is mandatory. Candidates with passing TET (${HIGH_SCHOOL_TET_PASS_MARK}+) are ranked before others.`,
          "Ranking order:",
          "Earlier Year of Registration.",
          "Earlier Year of Passing.",
          "Older Age (Date of Birth).",
          "Higher TET Score (for TET candidates).",
        ];

  const elementary =
    language === "ta"
      ? [
          `முக்கிய விதி: TET தேர்வில் ${ELEMENTARY_TET_PASS_MARK}% அல்லது அதற்கு மேல் பெற்றவர்கள் முதல் முன்னுரிமை பெறுவர்.`,
          "பலர் தகுதி பெற்றால் பின்வரும் வரிசை பின்பற்றப்படும்:",
          "முதலில் பதிவு செய்த ஆண்டு.",
          "முதலில் தேர்ச்சி பெற்ற ஆண்டு.",
          "அதிக வயது (பிறந்த தேதி அடிப்படையில்).",
          "TET தேர்வில் எடுத்த அதிக மதிப்பெண்.",
        ]
      : [
          `Priority 1: Candidates with TET score of ${ELEMENTARY_TET_PASS_MARK}% or more are ranked first.`,
          "If multiple candidates qualify, the order is:",
          "Earlier Year of Registration.",
          "Earlier Year of Passing.",
          "Older Age (Date of Birth).",
          "Higher TET Marks.",
        ];

  const clergy =
    language === "ta"
      ? [
          "நிலை 1: முதலில் Ordination (Year of Passing) பெற்றவர் முன்னுரிமை.",
          "நிலை 2: அதிக ஆண்டுகள் பணி அனுபவம் உள்ளவர் முன்னுரிமை.",
          "நிலை 3: வயதில் மூத்தவர் முன்னுரிமை.",
        ]
      : [
          "Priority 1: Earlier Year of Ordination (Year of Passing).",
          "Priority 2: Higher Years of Experience.",
          "Priority 3: Older Age (Date of Birth).",
        ];

  return { high, elementary, clergy };
}
