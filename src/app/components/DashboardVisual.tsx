
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../i18n/language";

ChartJS.register(ArcElement, Tooltip, Legend);

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

function buildLabeledStats(stats: Record<string, number>) {
  const entries = Object.entries(stats);
  return {
    labels: entries.map(([label]) => String(label)),
    values: entries.map(([, value]) => value),
  };
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


  const councilLabeled = buildLabeledStats(councilStats);
  const departmentLabeled = buildLabeledStats(departmentStats);
  const pastorateLabeled = buildLabeledStats(pastorateStats);
  const homePastorateLabeled = buildLabeledStats(homePastorateStats);
  const qualificationLabeled = buildLabeledStats(qualificationStats);
  const levelLabeled = buildLabeledStats(levelStats);

  const chartData = {
    council: {
      labels: councilLabeled.labels,
      datasets: [
        {
          label: t("Candidates by Council", "கவுன்சில் வாரியான விண்ணப்பதாரர்கள்"),
          data: councilLabeled.values,
          backgroundColor: getPalette(Object.keys(councilStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    department: {
      labels: departmentLabeled.labels,
      datasets: [
        {
          label: t("By Department", "துறை அடிப்படையில்"),
          data: departmentLabeled.values,
          backgroundColor: getPalette(Object.keys(departmentStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    pastorate: {
      labels: pastorateLabeled.labels,
      datasets: [
        {
          label: t("By Pastorate", "பாஸ்டரேட் அடிப்படையில்"),
          data: pastorateLabeled.values,
          backgroundColor: getPalette(Object.keys(pastorateStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    homePastorate: {
      labels: homePastorateLabeled.labels,
      datasets: [
        {
          label: t("By Home Pastorate", "சொந்த பாஸ்டரேட் அடிப்படையில்"),
          data: homePastorateLabeled.values,
          backgroundColor: getPalette(Object.keys(homePastorateStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    qualification: {
      labels: qualificationLabeled.labels,
      datasets: [
        {
          label: t("By Qualification", "தகுதி அடிப்படையில்"),
          data: qualificationLabeled.values,
          backgroundColor: getPalette(Object.keys(qualificationStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    level: {
      labels: levelLabeled.labels,
      datasets: [
        {
          label: t("By Level", "நிலை அடிப்படையில்"),
          data: levelLabeled.values,
          backgroundColor: getPalette(Object.keys(levelStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
          borderRadius: 6,
        },
      ],
    },
    pgug: {
      labels: buildLabeledStats(pgugStats).labels,
      datasets: [
        {
          label: t("Category Split", "வகைப் பிரிவு"),
          data: buildLabeledStats(pgugStats).values,
          backgroundColor: getPalette(Object.keys(pgugStats).length),
          borderWidth: 1,
          borderColor: "#ffffff",
        },
      ],
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
    interaction: { mode: "nearest" as const, intersect: false },
    cutout: "58%",
    animation: {
      duration: 1200,
      easing: "easeInOutBack",
    },
  };

  const activeChart =
    tab === "council"
      ? chartData.council
      : tab === "department"
      ? chartData.department
      : tab === "pastorate"
      ? chartData.pastorate
      : tab === "homePastorate"
      ? chartData.homePastorate
      : tab === "qualification"
      ? chartData.qualification
      : tab === "level"
      ? chartData.level
      : chartData.pgug;

  const pieOptions = { ...doughnutOptions, cutout: "0%" };

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
            <img
              src="/diocese-logo.png"
              alt="CSI Thoothukudi-Nazareth Diocese logo"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow"
            />
            <h2 className="text-2xl sm:text-3xl font-bold mt-2 mb-1 text-center text-slate-900">
              {t("Priority Dashboard", "முன்னுரிமை டாஷ்போர்டு")}
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
          <div className="w-full flex flex-col items-center justify-center">
            <div className="w-full h-[300px] sm:h-[360px] lg:h-[380px] flex items-center justify-center">
              <div className="w-full max-w-[520px] h-full">
                <Doughnut data={activeChart} options={pieOptions} />
              </div>
            </div>
            <div className="w-full mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeChart.labels.map((label, idx) => (
                  <motion.div
                    key={`${label}-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.02 }}
                    className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: activeChart.datasets[0]?.backgroundColor?.[idx] || "#94a3b8" }}
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeChart.datasets[0]?.data?.[idx] ?? 0}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
