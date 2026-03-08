import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileDown, MapPin } from "lucide-react";
import { Link } from "react-router";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { SchoolVacancyMap } from "../components/SchoolVacancyMap";
import { useLanguage } from "../i18n/language";
import { HIGH_SCHOOL_SECTION_ENABLED, MIDDLE_SCHOOL_SECTION_ENABLED } from "../config/features";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const DEFAULT_SCHOOL_VACANCY_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQizNtmY220qkpPceFvfQk_M241lqzKs3K3ffxYTng5cLslZK_Xm6LlkQelDWdXQH2Plo_AmYwmnBew/pub?gid=1387124453&single=true&output=csv";

function parseCSVLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  values.push(current.trim());
  return values;
}

function parseCSV(text: string) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (!lines.length) return [];

  const headers = parseCSVLine(lines[0].replace(/^\uFEFF/, ""));
  return lines.slice(1).map((line) => {
    const rowValues = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = rowValues[idx] ?? "";
    });
    return row;
  });
}

function appendNoCacheParam(url: string) {
  const u = new URL(url, window.location.origin);
  u.searchParams.set("_ts", String(Date.now()));
  return u.toString();
}

async function fetchSchoolVacancyRows(): Promise<any[]> {
  const configuredUrl =
    import.meta.env.VITE_SCHOOL_VACANCY_DATA_URL ||
    import.meta.env.VITE_SCHOOL_VACANCY_CSV_URL ||
    DEFAULT_SCHOOL_VACANCY_CSV_URL;

  const urlToFetch = configuredUrl || "/seniority-data.json";
  const response = await fetch(appendNoCacheParam(urlToFetch), { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load school vacancy data");
  }

  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const raw = await response.text();
  const isJson = contentType.includes("application/json") || urlToFetch.toLowerCase().includes(".json");
  if (isJson) {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.schoolVacancies) ? parsed.schoolVacancies : Array.isArray(parsed) ? parsed : [];
  }

  if (/<html/i.test(raw) || contentType.includes("text/html")) {
    throw new Error("Expected CSV/JSON but got HTML");
  }
  return parseCSV(raw);
}

const FORM_FILES = {
  high: {
    path: "/forms/high-higher-secondary-school-form.pdf",
    name: "high-higher-secondary-school-form.pdf",
  },
  elementary: {
    path: "/forms/elementry-middle-school-form.pdf",
    name: "elementry-middle-school-form.pdf",
  },
} as const;

function downloadFormPDF(type: "high" | "elementary") {
  const file = FORM_FILES[type];
  const link = document.createElement("a");
  link.href = file.path;
  link.download = file.name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function getNumber(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeKey(key: string) {
  return String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getField(row: any, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  const wanted = new Set(keys.map(normalizeKey));
  for (const [k, v] of Object.entries(row || {})) {
    if (!wanted.has(normalizeKey(k))) continue;
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

function normalizeSchoolVacancy(row: any) {
  const latitude = Number(
    getField(row, ["latitude", "Latitude", "lat", "Lat", "School Latitude"])
  );
  const longitude = Number(
    getField(row, ["longitude", "Longitude", "lng", "Lng", "School Longitude"])
  );

  return {
    schoolId: getField(row, ["schoolId", "School ID", "id"]),
    name: getField(row, ["name", "Name", "School Name", "schoolName"]) || "School",
    mapLink: getField(row, ["maplink", "mapLink", "Map Link"]),
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
    vacancy: getNumber(
      getField(row, ["vacancy", "Vacancy", "Total Vacancy", "Vacancy Count"]) || 0
    ),
    type: getField(row, ["type", "School Type", "Type"]) || "Unknown",
    departmentVacancy:
      getField(row, [
        "departmentVacancy",
        "Department Vacancy",
        "Subject/Department Vacancy",
        "Subject / Department Vacancy",
        "Subject Vacancy",
      ]) || "",
  };
}

export function ApplyPage() {
  const { t } = useLanguage();
  const readIsDark = () =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const [isDark, setIsDark] = useState(readIsDark());
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let active = true;

    const load = (initial = false) => {
      if (initial) setLoading(true);
      fetchSchoolVacancyRows()
        .then((rows) => {
          if (!active) return;
          setSchools(rows.map(normalizeSchoolVacancy));
          setLastUpdated(new Date());
        })
        .catch(() => {
          if (!active) return;
          setSchools([]);
        })
        .finally(() => {
          if (!active) return;
          if (initial) setLoading(false);
        });
    };

    load(true);
    interval = setInterval(() => load(false), 60000);

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const onThemeChange = () => setIsDark(readIsDark());
    window.addEventListener("themechange", onThemeChange);
    return () => window.removeEventListener("themechange", onThemeChange);
  }, []);

  const totalVacancy = useMemo(() => schools.reduce((sum, school) => sum + getNumber(school.vacancy), 0), [schools]);

  const middleSchools = useMemo(
    () => schools.filter((s) => String(s.type || "").toLowerCase().includes("middle")),
    [schools]
  );
  const highSchools = useMemo(
    () =>
      schools.filter((s) => {
        const type = String(s.type || "").toLowerCase();
        return type.includes("high") || type.includes("higher");
      }),
    [schools]
  );

  const middleVacancy = useMemo(
    () => middleSchools.reduce((sum, school) => sum + getNumber(school.vacancy), 0),
    [middleSchools]
  );
  const highVacancy = useMemo(
    () => highSchools.reduce((sum, school) => sum + getNumber(school.vacancy), 0),
    [highSchools]
  );

  const vacancyByDepartment = useMemo(() => {
    const map: Record<string, number> = {};
    for (const school of schools) {
      const raw = String(school.departmentVacancy || "").trim();
      if (!raw) continue;
      const parts = raw
        .split(/[,\n;]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length === 0) continue;
      for (const part of parts) {
        const matched = part.match(/^(.+?)\s*[:\-\u2013\u2014]\s*(\d+)$/);
        if (matched) {
          const dept = matched[1].trim();
          const count = Number(matched[2]);
          map[dept] = (map[dept] || 0) + (Number.isFinite(count) ? count : 0);
        } else {
          map[part] = (map[part] || 0) + getNumber(school.vacancy);
        }
      }
    }
    return map;
  }, [schools]);

  const departmentOptions = useMemo(
    () => Object.keys(vacancyByDepartment).sort((a, b) => a.localeCompare(b)),
    [vacancyByDepartment]
  );

  const selectedDepartmentVacancy =
    selectedDepartment === "all" ? totalVacancy : vacancyByDepartment[selectedDepartment] || 0;

  const typeVacancyData = useMemo(
    () => ({
      labels: [
        t("Elementry/Middle School", "தொடக்க/நடுநிலை பள்ளி"),
        t("High/Higher Secondary School", "உயர்நிலை/மேல்நிலை பள்ளி"),
      ],
      datasets: [
        {
          label: t("Vacancy by School Type", "பள்ளி வகை வாரியாக காலிப்பணியிடங்கள்"),
          data: [middleVacancy, highVacancy],
          backgroundColor: isDark
            ? ["rgba(56,189,248,0.72)", "rgba(52,211,153,0.72)"]
            : ["rgba(14,165,233,0.85)", "rgba(16,185,129,0.85)"],
          borderColor: isDark ? ["#0ea5e9", "#10b981"] : ["#0284c7", "#059669"],
          borderWidth: 2,
        },
      ],
    }),
    [highVacancy, isDark, middleVacancy, t]
  );

  const departmentChartData = useMemo(() => {
    const entries = Object.entries(vacancyByDepartment)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
    return {
      labels: entries.map(([name]) => name),
      datasets: [
        {
          label: t("Vacancy", "காலிப்பணியிடம்"),
          data: entries.map(([, count]) => count),
          backgroundColor: [
            "#0ea5e9",
            "#22c55e",
            "#f59e0b",
            "#6366f1",
            "#ef4444",
            "#14b8a6",
            "#8b5cf6",
            "#f97316",
            "#06b6d4",
            "#84cc16",
            "#ec4899",
            "#3b82f6",
          ],
          borderRadius: 6,
        },
      ],
    };
  }, [vacancyByDepartment, t]);

  const topSchoolsChartData = useMemo(() => {
    const entries = [...schools]
      .sort((a, b) => getNumber(b.vacancy) - getNumber(a.vacancy))
      .slice(0, 8);
    return {
      labels: entries.map((s) => s.name),
      datasets: [
        {
          label: t("Vacancy", "காலிப்பணியிடம்"),
          data: entries.map((s) => getNumber(s.vacancy)),
          backgroundColor: entries.map((s) =>
            String(s.type || "").toLowerCase().includes("high") ? "#10b981" : "#0ea5e9"
          ),
          borderRadius: 6,
        },
      ],
    };
  }, [schools, t]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        ticks: { color: isDark ? "#cbd5e1" : "#475569" },
        grid: { color: isDark ? "rgba(100,116,139,0.35)" : "#e2e8f0" },
      },
      y: {
        ticks: { color: isDark ? "#cbd5e1" : "#475569" },
        grid: { color: isDark ? "rgba(100,116,139,0.35)" : "#e2e8f0" },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: isDark ? "#e2e8f0" : "#334155", font: { size: 12, weight: 600 as const } },
      },
    },
    cutout: "58%",
  };

  return (
    <div className="apply-shell h-full overflow-auto dashboard-shell">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
          <ArrowLeft className="w-4 h-4" />
          {t("Back to Dashboard", "டாஷ்போர்டுக்கு திரும்பு")}
        </Link>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {HIGH_SCHOOL_SECTION_ENABLED ? (
              <Button
                onClick={() => downloadFormPDF("high")}
                className="apply-download-btn apply-download-btn--high text-white py-4 h-auto whitespace-normal text-center leading-tight"
              >
                <FileDown className="w-4 h-4 mr-2 shrink-0" />
                <span className="hidden sm:inline">
                  {t("Download High/Higher Secondary School Form", "உயர்நிலை/மேல்நிலை பள்ளி விண்ணப்பப் படிவத்தை பதிவிறக்கம் செய்க")}
                </span>
                <span className="sm:hidden">
                  {t("Download High School Form", "உயர்நிலை படிவம் பதிவிறக்கம்")}
                </span>
              </Button>
            ) : null}
            {MIDDLE_SCHOOL_SECTION_ENABLED ? (
              <Button
                onClick={() => downloadFormPDF("elementary")}
                className="apply-download-btn apply-download-btn--elementary text-white py-4 h-auto whitespace-normal text-center leading-tight"
              >
                <FileDown className="w-4 h-4 mr-2 shrink-0" />
                <span className="hidden sm:inline">
                  {t("Download Elementry/Middle School Form", "தொடக்க/நடுநிலை பள்ளி விண்ணப்பப் படிவத்தை பதிவிறக்கம் செய்க")}
                </span>
                <span className="sm:hidden">
                  {t("Download Middle School Form", "நடுநிலை படிவம் பதிவிறக்கம்")}
                </span>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              {t("School Vacancy Map", "பள்ளி காலிப்பணியிடம் வரைபடம்")}
            </h2>
            {lastUpdated ? (
              <span className="text-xs text-gray-500">
                {t("Last updated", "கடைசியாக புதுப்பிக்கப்பட்டது")}: {lastUpdated.toLocaleTimeString()}
              </span>
            ) : null}
          </div>
            {loading ? (
            <div className="glass-panel rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
              {t("Loading school locations...", "பள்ளி இருப்பிடங்கள் ஏற்றப்படுகிறது...")}
            </div>
          ) : (
            <SchoolVacancyMap schools={schools} />
          )}
        </div>

        <div className="space-y-4">
          <Card className="glass-panel apply-card">
            <CardContent className="pt-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
                {t("Vacancy Dashboard", "காலிப்பணியிடம் டாஷ்போர்டு")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="apply-kpi-card rounded-lg border border-indigo-200 p-4">
                  <p className="text-sm text-indigo-700">{t("Total Elementry/Middle School", "மொத்த தொடக்க/நடுநிலை பள்ளிகள்")}</p>
                  <p className="text-2xl font-bold text-indigo-900">{middleSchools.length}</p>
                </div>
                <div className="apply-kpi-card rounded-lg border border-cyan-200 p-4">
                  <p className="text-sm text-cyan-700">{t("Total Elementry/Middle School Vacancy", "மொத்த தொடக்க/நடுநிலை காலிப்பணியிடங்கள்")}</p>
                  <p className="text-2xl font-bold text-cyan-900">{middleVacancy}</p>
                </div>
                <div className="apply-kpi-card rounded-lg border border-blue-200 p-4">
                  <p className="text-sm text-blue-700">{t("Total High/Higher Secondary School", "மொத்த உயர்நிலை/மேல்நிலை பள்ளிகள்")}</p>
                  <p className="text-2xl font-bold text-blue-900">{highSchools.length}</p>
                </div>
                <div className="apply-kpi-card rounded-lg border border-emerald-200 p-4">
                  <p className="text-sm text-emerald-700">{t("Total High/Higher Secondary School Vacancy", "மொத்த உயர்நிலை/மேல்நிலை காலிப்பணியிடங்கள்")}</p>
                  <p className="text-2xl font-bold text-emerald-900">{highVacancy}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-panel apply-chart-card rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    {t("Vacancy by School Type", "பள்ளி வகை வாரியாக காலிப்பணியிடம்")}
                  </p>
                  <div className="h-64">
                    <Doughnut data={typeVacancyData} options={doughnutOptions} />
                  </div>
                </div>
                <div className="glass-panel apply-chart-card rounded-lg border border-slate-200 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    {t("Top Schools by Vacancy", "அதிக காலிப்பணியிடமுள்ள பள்ளிகள்")}
                  </p>
                  {topSchoolsChartData.labels.length === 0 ? (
                    <p className="text-sm text-gray-500">{t("No school vacancy data available.", "பள்ளி காலிப்பணியிடம் தரவு இல்லை.")}</p>
                  ) : (
                    <div className="h-64">
                      <Bar data={topSchoolsChartData} options={barOptions} />
                    </div>
                  )}
                </div>
              </div>

              <div className="apply-filter-box mt-5 rounded-lg border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  {t("Subject / Department Wise Vacancy", "பாடம் / துறை வாரியான காலிப்பணியிடம்")}
                </p>
                {departmentOptions.length === 0 ? (
                  <p className="text-sm text-gray-500">{t("No subject/department-wise vacancy data.", "பாடம்/துறை வாரியான காலிப்பணியிடம் தரவு இல்லை.")}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <label htmlFor="department-vacancy" className="text-xs text-gray-600 block mb-1">
                        {t("Select Subject / Department", "பாடம் / துறை தேர்வு செய்க")}
                      </label>
                      <select
                        id="department-vacancy"
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white/70 dark:bg-slate-900/80 dark:text-slate-100 dark:border-slate-600 px-3 py-2 text-sm"
                      >
                        <option value="all">{t("All Subjects / Departments", "அனைத்து பாடங்கள் / துறைகள்")}</option>
                        {departmentOptions.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="apply-total-box rounded-md border border-violet-200 px-3 py-2">
                      <p className="text-xs text-violet-700">
                        {selectedDepartment === "all"
                          ? t("Total Vacancy (All Subjects/Departments)", "மொத்த காலிப்பணியிடம் (அனைத்து பாடங்கள்/துறைகள்)")
                          : `${t("Vacancy", "காலிப்பணியிடம்")} (${selectedDepartment})`}
                      </p>
                      <p className="text-xl font-bold text-violet-900">{selectedDepartmentVacancy}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="glass-panel apply-chart-card mt-5 rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  {t("Subject / Department Vacancy Distribution", "பாடம் / துறை காலிப்பணியிடம் பகிர்வு")}
                </p>
                {departmentChartData.labels.length === 0 ? (
                  <p className="text-sm text-gray-500">{t("No subject/department-wise vacancy data.", "பாடம்/துறை வாரியான காலிப்பணியிடம் தரவு இல்லை.")}</p>
                ) : (
                  <div className="h-72">
                    <Bar data={departmentChartData} options={barOptions} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
