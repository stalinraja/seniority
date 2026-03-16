import { useState, useMemo, useEffect, useRef } from "react";
import { SearchBar } from "../components/SearchBar";
import { FilterSidebar, FilterGroup } from "../components/FilterSidebar";
import { SeniorityTable } from "../components/SeniorityTable";
import { AppointmentReport } from "../components/AppointmentReport";
import { fetchGoogleSheetData } from "../utils/fetchGoogleSheetData";
import { searchCandidatesGeneric } from "../utils/helpers";
import { Button } from "../components/ui/button";
import { DashboardVisual } from "../components/DashboardVisual";
import { useSearchParams } from "react-router";
import {
  compareClergyOrdinationCandidates,
  compareElementarySchoolCandidates,
  compareElementarySchoolSeniorityCandidates,
  compareHighSchoolCandidates,
  compareHighSchoolSeniorityCandidates,
} from "../config/seniorityRules";
import { useLanguage } from "../i18n/language";
import {
  APPOINTMENT_REPORT_ENABLED,
  CLERGY_SECTION_ENABLED,
  HIGH_SCHOOL_TET_PASS_MARK,
  HIGH_SCHOOL_SECTION_ENABLED,
  MIDDLE_SCHOOL_SECTION_ENABLED,
} from "../config/features";

type SchoolType = "high" | "elementary" | "clergy";

type SortMode = "seniority" | "appointment";

function normalizeText(value: any) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeFilterKey(value: any) {
  return normalizeText(value).toLowerCase();
}

function isYesValue(value: any) {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === "yes" || normalized === "y" || normalized === "true" || normalized === "1";
}

function parseDate(value: any) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const compact = raw.replace(/\s+/g, "");
  const normalized = compact.replace(/[./-]+/g, ".");

  // Supports dd.mm.yy, dd.mm.yyyy, dd/mm/yy, dd-mm-yy (tolerates extra separators/spaces).
  const m = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const yearRaw = Number(m[3]);
    const year = String(m[3]).length === 2 ? (yearRaw <= 30 ? 2000 + yearRaw : 1900 + yearRaw) : yearRaw;
    const d = new Date(year, month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNumber(value: any) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseExperienceYears(value: any) {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const numeric = toNumber(raw);
  if (numeric !== null) return numeric;

  const yearsMatch = raw.match(/(\d+(?:\.\d+)?)\s*year/i);
  const monthsMatch = raw.match(/(\d+(?:\.\d+)?)\s*month/i);
  const years = yearsMatch ? Number(yearsMatch[1]) : 0;
  const months = monthsMatch ? Number(monthsMatch[1]) : 0;
  const total = years + months / 12;
  return Number.isFinite(total) && total > 0 ? total : null;
}

function getLooseValue(row: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  const wanted = new Set(
    keys.map((k) =>
      String(k)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
    )
  );
  for (const [k, v] of Object.entries(row || {})) {
    const normalized = String(k)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (wanted.has(normalized)) return v;
  }
  return "";
}

function normalizePassingLabel(value: any) {
  if (value === undefined || value === null) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  const monthYear = raw.match(/^([A-Za-z]+\.?)\s*[-./]?\s*(\d{2,4})$/);
  if (monthYear) {
    const month = monthYear[1];
    const yRaw = Number(monthYear[2]);
    const year =
      monthYear[2].length === 2 ? (yRaw <= 30 ? 2000 + yRaw : 1900 + yRaw) : yRaw;
    return `${month} ${year}`;
  }

  const onlyYear = raw.match(/^(\d{2,4})$/);
  if (onlyYear) {
    const yRaw = Number(onlyYear[1]);
    const year =
      onlyYear[1].length === 2 ? (yRaw <= 30 ? 2000 + yRaw : 1900 + yRaw) : yRaw;
    return String(year);
  }

  return raw;
}

function extractPassingYear(value: any): number | null {
  const raw = normalizePassingLabel(value);
  if (!raw) return null;
  const fourDigit = raw.match(/\b(19|20)\d{2}\b/);
  if (fourDigit) return Number(fourDigit[0]);
  const twoDigit = raw.match(/\b(\d{2})\b/);
  if (!twoDigit) return null;
  const yy = Number(twoDigit[1]);
  return yy <= 30 ? 2000 + yy : 1900 + yy;
}

function parseTetMetrics(value: any): {
  qualified: boolean | null;
  bestScore: number | null;
  bestYear: number | null;
} {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { qualified: null, bestScore: null, bestYear: null };
  }

  const raw = String(value).trim();
  const low = raw.toLowerCase();

  if (["yes", "y", "true", "qualified", "pass", "passed"].includes(low)) {
    return { qualified: true, bestScore: null, bestYear: null };
  }
  if (["no", "n", "false", "not qualified", "fail", "failed"].includes(low)) {
    return { qualified: false, bestScore: null, bestYear: null };
  }

  const pairs: Array<{ year: number; score: number }> = [];
  const pairRegex = /(19|20)\d{2}\s*[-:/]\s*(\d{1,3})/g;
  for (const match of raw.matchAll(pairRegex)) {
    const year = Number(match[0].match(/(19|20)\d{2}/)?.[0] || "");
    const score = Number(match[2]);
    if (Number.isFinite(year) && Number.isFinite(score)) {
      pairs.push({ year, score });
    }
  }

  if (pairs.length === 0) {
    const standaloneScore = Number(low.replace("%", ""));
    if (Number.isFinite(standaloneScore)) {
      return {
        qualified: standaloneScore >= HIGH_SCHOOL_TET_PASS_MARK,
        bestScore: standaloneScore,
        bestYear: null,
      };
    }
    return { qualified: null, bestScore: null, bestYear: null };
  }

  pairs.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score; // higher score first
    return a.year - b.year; // if tie score, earlier year first
  });

  const best = pairs[0];
  return {
    qualified: best.score >= HIGH_SCHOOL_TET_PASS_MARK,
    bestScore: best.score,
    bestYear: best.year,
  };
}

function getAppointmentFields(row: Record<string, any>, schoolType: SchoolType) {
  const appointedRaw =
    getLooseValue(row, ["appointed", "Appointed", "Appointment", "Appointment Made", "Appointed?"]) ||
    "";
  const appointedDate = normalizeText(
    getLooseValue(row, ["appointedDate", "Appointed Date", "Apointed Date", "Date of Appointment"])
  );
  const compassionReason = normalizeText(
    getLooseValue(row, [
      "compassionReason",
      "Compassion Reason",
      "Compassion Based Reason",
      "Compassion if any",
      "Reason",
    ])
  );

  const explicitLocation = normalizeText(
    schoolType === "clergy"
      ? getLooseValue(row, [
          "appointedPastorate",
          "Appointed Pastorate",
          "Appointed Location",
          "Appointed pastorate",
          "Pastorate",
          "Home Pastorate",
          "Home-Pastorate",
        ])
      : getLooseValue(row, [
          "appointedSchool",
          "Appointed School",
          "Appointed institute",
          "Appointed Institute",
          "Appointed Location",
          "School",
          "Institute",
          "Institution",
        ])
  );

  return {
    appointed: isYesValue(appointedRaw),
    appointedRaw: normalizeText(appointedRaw),
    appointedDate,
    compassionReason,
    appointedLocation: explicitLocation,
  };
}

function mapHighSchool(rows: any[]) {
  return rows
    .map((c: any, rowIndex: number) => {
      const dateOfBirth = parseDate(c.dateOfBirth || c.DateOfBirth || c["Date of Birth"]);
      const yearOfRegistering = toNumber(
        c.yearOfRegistering || c.YearOfRegistering || c["Year of Registering"]
      );
      const normalizedName =
        c.name ||
        c.Name ||
        c["Full Name"] ||
        c["Candidate Name"] ||
        c["NAME"] ||
        "Unnamed";
      const fallbackId = [
        c.memberId || c["Member ID"] || c["Member Id"] || "",
        normalizedName,
        c.dateOfBirth || c.DateOfBirth || c["Date of Birth"] || "",
        c.yearOfRegistering || c.YearOfRegistering || c["Year of Registering"] || "",
        c.department || c.Department || "",
        c.category || c.Category || c.pgug || c.PGUG || c["PG/UG"] || "",
        String(rowIndex),
      ].join("|");
      return {
        id: c.id || c.ID || c.Id || fallbackId,
        memberId: c.memberId || c["Member ID"] || c["Member Id"] || "",
        name: normalizedName,
        dateOfBirth,
        yearOfPassing: normalizePassingLabel(
          c.yearOfPassing || c.YearOfPassing || c["Year of Passing"] || c["Month & Year of Passing"]
        ),
        yearOfRegistering,
        council: normalizeText(c.council || c.Council || ""),
        pastorate: normalizeText(c.pastorate || c.Pastorate || ""),
        institution: normalizeText(c.institution || c.Institution || ""),
        department: normalizeText(c.department || c.Department || ""),
        category: normalizeText(c.category || c.Category || c.pgug || c.PGUG || c["PG/UG"] || ""),
        ...(() => {
          const tetRaw =
            c.tetQualified || c["TET Qualified"] || c["TET Qualification"] || c["TET %"] || "";
          const tet = parseTetMetrics(tetRaw);
          return {
            tetRaw: normalizeText(tetRaw),
            tetQualified: tet.qualified,
            tetScore: tet.bestScore,
            tetYear: tet.bestYear,
          };
        })(),
        qualification: normalizeText(c.qualification || c.Qualification || ""),
        address: normalizeText(c.address || c.Address || ""),
        pincode: normalizeText(c.pincode || c.Pincode || ""),
        email: c.email || c.Email || "",
        phone: c.phone || c.Phone || "",
        ...(() => {
          const appointment = getAppointmentFields(c, "high");
          if (!appointment.appointedLocation) {
            appointment.appointedLocation = normalizeText(
              c.institution || c.Institution || c.school || c.School || c.pastorate || c.Pastorate || ""
            );
          }
          return appointment;
        })(),
      };
    })
    .filter((c) => c.name !== "Unnamed" && c.dateOfBirth && c.yearOfRegistering !== null);
}

function mapElementarySchool(rows: any[]) {
  return rows
    .map((c: any, rowIndex: number) => {
      const dateOfBirth = parseDate(c.dateOfBirth || c.DateOfBirth || c["Date of Birth"]);
      const tetRaw =
        c.tetCompletion ||
        c.tedCompletion ||
        c["Ted Completion"] ||
        c["TET Qualification"] ||
        c["TET %"] ||
        "";
      const tetCompletion = Number(String(tetRaw).replace("%", "").trim());
      const fallbackId = [
        c.memberId || c["Member ID"] || c["Member Id"] || "",
        c.name || c.Name || c["Full Name"] || "",
        c.dateOfBirth || c.DateOfBirth || c["Date of Birth"] || "",
        c.category || c.Category || "",
        c.level || c.Level || "",
        String(rowIndex),
      ].join("|");
      return {
        id: c.id || c.ID || c.Id || fallbackId,
        memberId: c.memberId || c["Member ID"] || c["Member Id"] || "",
        name: c.name || c.Name || c["Full Name"] || "Unnamed",
        dateOfBirth,
        yearOfPassing: toNumber(c.yearOfPassing || c.YearOfPassing || c["Year of Passing"]),
        yearOfRegistering: toNumber(
          c.yearOfRegistering || c.YearOfRegistering || c["Year of Registering"]
        ),
        council: normalizeText(c.council || c.Council || ""),
        pastorate: normalizeText(c.pastorate || c.Pastorate || ""),
        category: normalizeText(c.category || c.Category || ""),
        level: normalizeText(c.level || c.Level || ""),
        qualification: normalizeText(c.qualification || c.Qualification || ""),
        tetCompletion: Number.isFinite(tetCompletion) ? tetCompletion : null,
        ...(() => {
          const appointment = getAppointmentFields(c, "elementary");
          if (!appointment.appointedLocation) {
            appointment.appointedLocation = normalizeText(
              c.school || c.School || c.pastorate || c.Pastorate || ""
            );
          }
          return appointment;
        })(),
      };
    })
    .filter((c) => c.name !== "Unnamed" && c.dateOfBirth && c.yearOfRegistering !== null);
}

function mapClergyOrdination(rows: any[]) {
  return rows
    .map((c: any, rowIndex: number) => {
      const dateOfBirth = parseDate(
        getLooseValue(c, ["dateOfBirth", "DateOfBirth", "Date of Birth", "Date of birth"])
      );
      const yearOfPassingRaw = getLooseValue(c, [
        "yearOfPassing",
        "YearOfPassing",
        "Year of Passing",
        "Year of passing",
      ]);
      const yearsOfExperienceRaw = getLooseValue(c, [
        "yearsOfExperience",
        "Years of Experience",
        "Years of experience",
        "Year of Experience",
      ]);
      const fallbackId = [
        getLooseValue(c, ["memberId", "Member ID", "Member Id"]),
        getLooseValue(c, ["name", "Name", "Full Name"]),
        getLooseValue(c, ["dateOfBirth", "DateOfBirth", "Date of Birth", "Date of birth"]),
        yearOfPassingRaw,
        String(rowIndex),
      ].join("|");
      return {
        id: c.id || c.ID || c.Id || fallbackId,
        memberId: getLooseValue(c, ["memberId", "Member ID", "Member Id"]),
        name: getLooseValue(c, ["name", "Name", "Full Name"]) || "Unnamed",
        dateOfBirth,
        yearOfPassing: extractPassingYear(yearOfPassingRaw),
        yearsOfExperience: parseExperienceYears(yearsOfExperienceRaw),
        qualification: normalizeText(getLooseValue(c, ["qualification", "Qualification"])),
        homePastorate: normalizeText(
          getLooseValue(c, ["homePastorate", "Home Pastorate", "Home-Pastorate"])
        ),
        ...(() => {
          const appointment = getAppointmentFields(c, "clergy");
          if (!appointment.appointedLocation) {
            appointment.appointedLocation = normalizeText(
              getLooseValue(c, ["homePastorate", "Home Pastorate", "Home-Pastorate", "Pastorate"])
            );
          }
          return appointment;
        })(),
      };
    })
    .filter((c) => c.name !== "Unnamed" && c.dateOfBirth && c.yearOfPassing !== null);
}

function rankHighSchool(rows: any[], mode: SortMode) {
  return [...rows]
    .sort((a, b) => (mode === "seniority" ? compareHighSchoolSeniorityCandidates(a, b, extractPassingYear) : compareHighSchoolCandidates(a, b, extractPassingYear)))
    .map((c, idx) => ({ ...c, rank: idx + 1 }));
}

function rankElementarySchool(rows: any[], mode: SortMode) {
  return [...rows]
    .sort((a, b) => (mode === "seniority" ? compareElementarySchoolSeniorityCandidates(a, b, extractPassingYear) : compareElementarySchoolCandidates(a, b, extractPassingYear)))
    .map((c, idx) => ({ ...c, rank: idx + 1 }));
}

function rankClergyOrdination(rows: any[]) {
  return [...rows]
    .sort((a, b) => compareClergyOrdinationCandidates(a, b, extractPassingYear))
    .map((c, idx) => ({ ...c, rank: idx + 1 }));
}

function buildFilterItems(rows: any[], key: string) {
  return [...new Set(rows.map((r) => normalizeText(r[key])).filter(Boolean))];
}

function buildStableHashPayload(rows: any[]) {
  return rows.map((r) => ({
    id: r.id,
    memberId: r.memberId || "",
    name: r.name || "",
    dateOfBirth:
      r.dateOfBirth instanceof Date
        ? r.dateOfBirth.toISOString()
        : String(r.dateOfBirth || ""),
    yearOfPassing: r.yearOfPassing ?? "",
    yearOfRegistering: r.yearOfRegistering ?? "",
    council: r.council || "",
    pastorate: r.pastorate || "",
    diocese: r.diocese || "",
    institution: r.institution || "",
    department: r.department || "",
    category: r.category || "",
    level: r.level || "",
    qualification: r.qualification || "",
    homePastorate: r.homePastorate || "",
    yearsOfExperience: r.yearsOfExperience ?? "",
    tetQualified: r.tetQualified ?? "",
    tetScore: r.tetScore ?? "",
    tetYear: r.tetYear ?? "",
    tetRaw: r.tetRaw ?? "",
    tetCompletion: r.tetCompletion ?? "",
    appointed: r.appointed ?? false,
    appointedRaw: r.appointedRaw ?? "",
    appointedDate: r.appointedDate ?? "",
    compassionReason: r.compassionReason ?? "",
    appointedLocation: r.appointedLocation ?? "",
  }));
}

export function Dashboard() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const PAGE_SIZE = 20;
  const [schoolType, setSchoolType] = useState<SchoolType>("high");
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAppointments, setShowAppointments] = useState(
    APPOINTMENT_REPORT_ENABLED && searchParams.get("appointments") === "1"
  );
  const [sortMode, setSortMode] = useState<SortMode>("seniority");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [highSchoolCandidates, setHighSchoolCandidates] = useState<any[]>([]);
  const [elementaryCandidates, setElementaryCandidates] = useState<any[]>([]);
  const [clergyCandidates, setClergyCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sortingPulse, setSortingPulse] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const lastDataHashRef = useRef<string>("");
  const availableSchoolTypes = useMemo<SchoolType[]>(() => {
    const list: SchoolType[] = [];
    if (HIGH_SCHOOL_SECTION_ENABLED) list.push("high");
    if (MIDDLE_SCHOOL_SECTION_ENABLED) list.push("elementary");
    if (CLERGY_SECTION_ENABLED) list.push("clergy");
    return list.length ? list : ["high"];
  }, []);

  useEffect(() => {
    if (!availableSchoolTypes.includes(schoolType)) {
      setSchoolType(availableSchoolTypes[0]);
    }
  }, [availableSchoolTypes, schoolType]);

  useEffect(() => {
    if (!APPOINTMENT_REPORT_ENABLED) {
      setShowAppointments(false);
      return;
    }
    if (searchParams.get("appointments") === "1") {
      setShowAppointments(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setFilters({});
    setSearchQuery("");
    setCurrentPage(1);
  }, [schoolType]);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const load = (initial = false) => {
      if (initial) setLoading(true);

      fetchGoogleSheetData()
        .then((data) => {
          const highRows = Array.isArray(data?.highSchool)
            ? data.highSchool
            : Array.isArray(data)
            ? data
            : [];
          const elementaryRows = Array.isArray(data?.elementarySchool)
            ? data.elementarySchool
            : [];
          const clergyRows = Array.isArray(data?.clergyOrdination) ? data.clergyOrdination : [];

          const mappedHigh = mapHighSchool(highRows);
          const mappedElementary = mapElementarySchool(elementaryRows);
          const mappedClergy = mapClergyOrdination(clergyRows);

          const dataHash = JSON.stringify({
            high: buildStableHashPayload(mappedHigh),
            elementary: buildStableHashPayload(mappedElementary),
            clergy: buildStableHashPayload(mappedClergy),
          });

          if (dataHash !== lastDataHashRef.current) {
            lastDataHashRef.current = dataHash;
            setHighSchoolCandidates(mappedHigh);
            setElementaryCandidates(mappedElementary);
            setClergyCandidates(mappedClergy);
            setLastUpdated(new Date());
          }

          setError(null);
          setLoading(false);
          if (initial) setInitialLoadDone(true);
        })
        .catch(() => {
          setError(t("Failed to load data", "தரவு ஏற்ற முடியவில்லை"));
          setLoading(false);
          if (initial) setInitialLoadDone(true);
        });
    };

    load(true);
    interval = setInterval(() => load(false), 60000);
    return () => clearInterval(interval);
  }, [t]);

  const showSplash = !(splashDone && initialLoadDone);

  const currentCandidates =
    schoolType === "high"
      ? highSchoolCandidates
      : schoolType === "elementary"
      ? elementaryCandidates
      : clergyCandidates;

  const filterGroups: FilterGroup[] = useMemo(() => {
    if (schoolType === "high") {
      return [
        { key: "department", title: t("Department", "துறை"), items: buildFilterItems(currentCandidates, "department") },
        { key: "category", title: t("Category", "வகை"), items: buildFilterItems(currentCandidates, "category") },
        { key: "pastorate", title: t("Pastorate", "பாஸ்டரேட்"), items: buildFilterItems(currentCandidates, "pastorate") },
        { key: "council", title: t("Council", "கவுன்சில்"), items: buildFilterItems(currentCandidates, "council") },
      ];
    }
    if (schoolType === "clergy") {
      return [
        { key: "homePastorate", title: t("Home Pastorate", "சொந்த பாஸ்டரேட்"), items: buildFilterItems(currentCandidates, "homePastorate") },
        { key: "qualification", title: t("Qualification", "தகுதி"), items: buildFilterItems(currentCandidates, "qualification") },
      ];
    }
    return [
      { key: "council", title: t("Council", "கவுன்சில்"), items: buildFilterItems(currentCandidates, "council") },
      { key: "pastorate", title: t("Pastorate", "பாஸ்டரேட்"), items: buildFilterItems(currentCandidates, "pastorate") },
      { key: "category", title: t("Category", "வகை"), items: buildFilterItems(currentCandidates, "category") },
      { key: "level", title: t("Level", "நிலை"), items: buildFilterItems(currentCandidates, "level") },
    ];
  }, [schoolType, currentCandidates, t]);

  const handleFilterChange = (category: string, value: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      [category]: checked ? [normalizeText(value)] : [],
    }));
  };

  const handleClearAllFilters = () => setFilters({});

  const filteredCandidates = useMemo(() => {
    let rows = [...currentCandidates];

    const activeFilterKeys =
      schoolType === "high"
        ? (["department", "category", "pastorate", "council"] as const)
        : schoolType === "elementary"
        ? (["council", "pastorate", "category", "level"] as const)
        : (["homePastorate", "qualification"] as const);

    const normalizedFilterMap = new Map<string, Set<string>>();
    for (const key of activeFilterKeys) {
      const selectedValues = filters[key] || [];
      if (!selectedValues.length) continue;
      normalizedFilterMap.set(
        key,
        new Set(
          selectedValues
            .map((value) => normalizeFilterKey(value))
            .filter(Boolean)
        )
      );
    }

    if (normalizedFilterMap.size > 0) {
      rows = rows.filter((candidate) => {
        for (const key of activeFilterKeys) {
          const wanted = normalizedFilterMap.get(key);
          if (!wanted || wanted.size === 0) continue;
          const candidateValue = normalizeFilterKey(candidate[key]);
          if (!wanted.has(candidateValue)) return false;
        }
        return true;
      });
    }

    const ranked =
      schoolType === "high"
        ? rankHighSchool(rows, sortMode)
        : schoolType === "elementary"
        ? rankElementarySchool(rows, sortMode)
        : rankClergyOrdination(rows);

    return searchQuery.trim() ? searchCandidatesGeneric(ranked, searchQuery) : ranked;
  }, [currentCandidates, filters, searchQuery, schoolType, sortMode]);

  const appointmentRows = useMemo(() => {
    const ranked =
      schoolType === "high"
        ? rankHighSchool(currentCandidates, "appointment")
        : schoolType === "elementary"
        ? rankElementarySchool(currentCandidates, "appointment")
        : rankClergyOrdination(currentCandidates);
    return ranked.filter((row) => row.appointed === true);
  }, [currentCandidates, schoolType]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(Math.max(prev, 1), totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchQuery, schoolType, sortMode]);

  useEffect(() => {
    setSortingPulse(true);
    const t = setTimeout(() => setSortingPulse(false), 450);
    return () => clearTimeout(t);
  }, [sortMode]);

  const pagedCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredCandidates.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredCandidates, currentPage]);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const mod = await import("../utils/pdfUtils");
      mod.downloadCandidatesPDF(filteredCandidates, filters as any, schoolType, sortMode);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleToggleAppointments = () => {
    if (!APPOINTMENT_REPORT_ENABLED) return;
    setShowAppointments((prev) => {
      const next = !prev;
      const nextParams = new URLSearchParams(searchParams);
      if (next) nextParams.set("appointments", "1");
      else nextParams.delete("appointments");
      setSearchParams(nextParams, { replace: true });
      return next;
    });
  };

  const handleDownloadAppointmentsReport = async () => {
    try {
      setDownloadingReport(true);
      const mod = await import("../utils/pdfUtils");
      mod.downloadAppointmentsReportPDF(appointmentRows, schoolType);
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <>
      {showSplash && (
        <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-white dark:bg-slate-950">
          <img
            src="/diocese-logo.png"
            alt="CSI Thoothukudi Nazareth Diocese logo"
            className="w-28 h-28 sm:w-36 sm:h-36 object-contain animate-pulse"
          />
        </div>
      )}
      <div className="flex h-full flex-col dashboard-shell">
      <div className="flex-1 flex flex-col overflow-visible min-w-0">
        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 glass-panel border-b border-gray-200 rounded-b-xl relative z-[2147481000] overflow-visible">
          <div className="flex flex-wrap justify-center gap-2 mb-4">
            {HIGH_SCHOOL_SECTION_ENABLED ? (
              <Button
                variant={schoolType === "high" ? "default" : "outline"}
                className={`w-full sm:w-auto ${
                  schoolType === "high"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-[rgb(250,252,255)] text-slate-900 border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                }`}
                onClick={() => setSchoolType("high")}
              >
                {t("High/Higher Secondary School Seniority", "உயர்நிலை/மேல்நிலை பள்ளி மூப்பு")}
              </Button>
            ) : null}
            {MIDDLE_SCHOOL_SECTION_ENABLED ? (
              <Button
                variant={schoolType === "elementary" ? "default" : "outline"}
                className={`w-full sm:w-auto ${
                  schoolType === "elementary"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-[rgb(250,252,255)] text-slate-900 border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                }`}
                onClick={() => setSchoolType("elementary")}
              >
                {t("Elementry/Middle School Seniority", "தொடக்க/நடுநிலை பள்ளி மூப்பு")}
              </Button>
            ) : null}
            {CLERGY_SECTION_ENABLED ? (
              <Button
                variant={schoolType === "clergy" ? "default" : "outline"}
                className={`w-full sm:w-auto ${
                  schoolType === "clergy"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-[rgb(250,252,255)] text-slate-900 border-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
                }`}
                onClick={() => setSchoolType("clergy")}
              >
                {t("Clergy Ordination Seniority", "குருத்துவ அர்ப்பணிப்பு மூப்பு")}
              </Button>
            ) : null}
          </div>

          <div className="mt-4">
            <FilterSidebar
              groups={filterGroups}
              selectedFilters={filters}
              onFilterChange={handleFilterChange}
              onClearAll={handleClearAllFilters}
              compact
              className="w-full"
            />
          </div>
        </div>

        {showDashboard && (
          <DashboardVisual
            candidates={filteredCandidates}
            schoolType={schoolType}
            onClose={() => setShowDashboard(false)}
          />
        )}

        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="mb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-2xl font-semibold text-gray-900">
                {schoolType === "high"
                  ? t("High/Higher Secondary School Seniority List", "உயர்நிலை/மேல்நிலை பள்ளி மூப்பு பட்டியல்")
                  : schoolType === "elementary"
                  ? t("Elementry/Middle School Seniority List", "தொடக்க/நடுநிலை பள்ளி மூப்பு பட்டியல்")
                  : t("Clergy Ordination Seniority List", "குருத்துவ அர்ப்பணிப்பு மூப்பு பட்டியல்")}
              </h2>
              {loading && (
                <span className="inline-flex items-center gap-1 text-blue-600 animate-pulse">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  {t("Loading...", "ஏற்றப்படுகிறது...")}
                </span>
              )}
              {lastUpdated && !loading && (
                <span className="text-xs text-gray-500">
                  {t("Last updated", "கடைசியாக புதுப்பிக்கப்பட்டது")}: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              {error
                ? error
                : currentCandidates.length === 0
                ? t(
                    "No data loaded. Please check your sync script and Google Sheet URL.",
                    "தரவு ஏற்றப்படவில்லை. உங்கள் sync script மற்றும் Google Sheet URL-ஐ சரிபார்க்கவும்."
                  )
                : t(
                    `Showing ${pagedCandidates.length} of ${filteredCandidates.length} filtered (total: ${currentCandidates.length})`,
                    `${filteredCandidates.length} வடிகட்டப்பட்டதில் ${pagedCandidates.length} காட்டப்படுகிறது (மொத்தம்: ${currentCandidates.length})`
                  )}
            </p>

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                className="max-w-xl"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf || filteredCandidates.length === 0}
                >
                  {downloadingPdf
                    ? t("Preparing PDF...", "PDF தயாராகிறது...")
                    : t("Download PDF", "PDF பதிவிறக்கம்")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDashboard(true)}
                  disabled={showDashboard || filteredCandidates.length === 0}
                >
                  {t("Open Dashboard", "டாஷ்போர்டை திற")}
                </Button>
                {APPOINTMENT_REPORT_ENABLED ? (
                  <Button variant="outline" onClick={handleToggleAppointments}>
                    {showAppointments
                      ? t("Hide Appointments", "நியமனங்களை மறை")
                      : t("Show Appointments", "நியமனங்களை காண்பி")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {showAppointments && (
            <div className="mb-4">
              <AppointmentReport
                rows={appointmentRows}
                schoolType={schoolType}
                onDownload={handleDownloadAppointmentsReport}
                downloading={downloadingReport}
              />
            </div>
          )}


          {!loading && !error && (
            <>
              <SeniorityTable
                rows={pagedCandidates}
                schoolType={schoolType}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
                sortingPulse={sortingPulse}
              />
              {filteredCandidates.length > PAGE_SIZE && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-600">
                    {t("Page", "பக்கம்")} {currentPage} {t("of", "இல்")} {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      {t("Previous", "முந்தையது")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                    >
                      {t("Next", "அடுத்தது")}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
