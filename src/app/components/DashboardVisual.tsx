
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../i18n/language";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const elegantPalette = [
  "#2563eb",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#84cc16",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#64748b",
];

function getPalette(n: number) {
  return Array.from({ length: n }, (_, i) => elegantPalette[i % elegantPalette.length]);
}

function groupBy(arr: any[], key: string) {
  return arr.reduce((acc, curr) => {
    const val = curr[key] || "Unknown";
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export function DashboardVisual({
  candidates,
  onClose,
  schoolType = "high",
}: {
  candidates: any[];
  onClose: () => void;
  schoolType?: "high" | "elementary" | "clergy";
}) {
  const { t } = useLanguage();
  const isElementary = schoolType === "elementary";
  const isClergy = schoolType === "clergy";
  const readIsDark = () =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const [isDark, setIsDark] = useState(readIsDark());
  const [tab, setTab] = useState("department");
  const councilStats = groupBy(candidates, "council");
  const departmentStats = groupBy(candidates, "department");
  const pastorateStats = groupBy(candidates, "pastorate");
  const homePastorateStats = groupBy(candidates, "homePastorate");
  const qualificationStats = groupBy(candidates, "qualification");
  const levelStats = groupBy(candidates, "level");
  const pgugStats = candidates.reduce((acc, curr) => {
    const value = curr.pgug || curr.category || "Unknown";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const tabs = isElementary
    ? [
        { key: "council", label: t("By Council", "கவுன்சில் அடிப்படையில்") },
        { key: "pastorate", label: t("By Pastorate", "பாஸ்டரேட் அடிப்படையில்") },
        { key: "level", label: t("By Level", "நிலை அடிப்படையில்") },
        { key: "pgug", label: t("Category Split", "வகைப் பிரிவு") },
      ]
    : isClergy
    ? [
        { key: "homePastorate", label: t("By Home Pastorate", "சொந்த பாஸ்டரேட் அடிப்படையில்") },
        { key: "qualification", label: t("By Qualification", "தகுதி அடிப்படையில்") },
      ]
    : [
        { key: "department", label: t("By Department", "துறை அடிப்படையில்") },
        { key: "pgug", label: t("Category Split", "வகைப் பிரிவு") },
      ];

  useEffect(() => {
    if (!tabs.some((t) => t.key === tab)) {
      setTab(tabs[0].key);
    }
  }, [tab, tabs]);

  useEffect(() => {
    const onThemeChange = () => setIsDark(readIsDark());
    window.addEventListener("themechange", onThemeChange);
    return () => window.removeEventListener("themechange", onThemeChange);
  }, []);

  const chartData = {
    council: {
      labels: Object.keys(councilStats),
      datasets: [
        {
          label: t("Candidates by Council", "கவுன்சில் வாரியான விண்ணப்பதாரர்கள்"),
          data: Object.values(councilStats),
          backgroundColor: getPalette(Object.keys(councilStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    department: {
      labels: Object.keys(departmentStats),
      datasets: [
        {
          label: t("By Department", "துறை அடிப்படையில்"),
          data: Object.values(departmentStats),
          backgroundColor: getPalette(Object.keys(departmentStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    pastorate: {
      labels: Object.keys(pastorateStats),
      datasets: [
        {
          label: t("By Pastorate", "பாஸ்டரேட் அடிப்படையில்"),
          data: Object.values(pastorateStats),
          backgroundColor: getPalette(Object.keys(pastorateStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    homePastorate: {
      labels: Object.keys(homePastorateStats),
      datasets: [
        {
          label: t("By Home Pastorate", "சொந்த பாஸ்டரேட் அடிப்படையில்"),
          data: Object.values(homePastorateStats),
          backgroundColor: getPalette(Object.keys(homePastorateStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    qualification: {
      labels: Object.keys(qualificationStats),
      datasets: [
        {
          label: t("By Qualification", "தகுதி அடிப்படையில்"),
          data: Object.values(qualificationStats),
          backgroundColor: getPalette(Object.keys(qualificationStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    level: {
      labels: Object.keys(levelStats),
      datasets: [
        {
          label: t("By Level", "நிலை அடிப்படையில்"),
          data: Object.values(levelStats),
          backgroundColor: getPalette(Object.keys(levelStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    pgug: {
      labels: Object.keys(pgugStats),
      datasets: [
        {
          label: t("Category Split", "வகைப் பிரிவு"),
          data: Object.values(pgugStats),
          backgroundColor: getPalette(Object.keys(pgugStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
        },
      ],
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: { color: isDark ? "#e2e8f0" : "#334155", font: { size: 13, weight: 600 } },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "#0f172a",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        borderColor: "#1e293b",
        borderWidth: 1,
        padding: 10,
        caretSize: 8,
        displayColors: true,
        boxPadding: 6,
      },
    },
    animation: {
      duration: 1500,
      easing: "easeInOutBack",
    },
    scales: {
      x: {
        ticks: { color: isDark ? "#cbd5e1" : "#475569", font: { weight: 600 } },
        grid: { color: isDark ? "rgba(100,116,139,0.35)" : "#e2e8f0" },
      },
      y: {
        ticks: { color: isDark ? "#cbd5e1" : "#475569", font: { weight: 600 } },
        grid: { color: isDark ? "rgba(100,116,139,0.35)" : "#e2e8f0" },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: { color: isDark ? "#e2e8f0" : "#334155", font: { size: 13, weight: 600 } },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "#0f172a",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        borderColor: "#1e293b",
        borderWidth: 1,
        padding: 10,
        caretSize: 8,
        displayColors: true,
        boxPadding: 6,
      },
    },
    cutout: "58%",
    animation: {
      duration: 1200,
      easing: "easeInOutBack",
    },
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[2147483647] flex items-center justify-center p-3 sm:p-4"
        style={{ backgroundColor: "rgba(15, 23, 42, 0.66)" }}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          transition={{ duration: 0.4 }}
          className="bg-[rgb(255,255,255)] dark:bg-[rgb(10,19,32)] rounded-xl shadow-xl p-4 sm:p-6 lg:p-8 max-w-3xl w-full relative border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto"
        >
          <Button
            onClick={onClose}
            className="absolute top-4 right-4"
            variant="outline"
          >
            {t("Close", "மூடு")}
          </Button>
          <div className="flex flex-col items-center mb-6">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="24" fill="#eff6ff" />
              <rect x="21" y="10" width="6" height="28" rx="3" fill="#2563eb" />
              <rect x="10" y="21" width="28" height="6" rx="3" fill="#2563eb" />
            </svg>
            <h2 className="text-2xl sm:text-3xl font-bold mt-2 mb-1 text-center text-slate-900">
              {t("Seniority Dashboard", "மூப்பு டாஷ்போர்டு")}
            </h2>
            <span className="text-slate-500 font-medium text-sm">
              {isElementary
                ? t("Overview by council, pastorate, level and category.", "கவுன்சில், பாஸ்டரேட், நிலை மற்றும் வகை அடிப்படையிலான காட்சி.")
                : isClergy
                ? t("Overview by home pastorate and qualification.", "சொந்த பாஸ்டரேட் மற்றும் தகுதி அடிப்படையிலான காட்சி.")
                : t("Overview by department and category.", "துறை மற்றும் வகை அடிப்படையிலான காட்சி.")}
            </span>
          </div>
          <div className="flex justify-center gap-2 sm:gap-3 mb-6 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`px-3 sm:px-4 py-2 rounded-full font-semibold text-sm sm:text-base transition-all duration-300 ${
                  tab === t.key
                    ? "bg-blue-600 text-white shadow-md scale-105"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                }`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="w-full h-[300px] sm:h-[360px] lg:h-[380px] flex items-center justify-center">
            {tab === "council" && <Bar data={chartData.council} options={barChartOptions} />}
            {tab === "department" && <Bar data={chartData.department} options={barChartOptions} />}
            {tab === "pastorate" && <Bar data={chartData.pastorate} options={barChartOptions} />}
            {tab === "homePastorate" && <Bar data={chartData.homePastorate} options={barChartOptions} />}
            {tab === "qualification" && <Bar data={chartData.qualification} options={barChartOptions} />}
            {tab === "level" && <Bar data={chartData.level} options={barChartOptions} />}
            {tab === "pgug" && (
              <div className="w-full max-w-[420px] h-full">
                <Doughnut data={chartData.pgug} options={doughnutOptions} />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
