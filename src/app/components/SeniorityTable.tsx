import { differenceInYears, format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { ChevronDown } from "lucide-react";
import { useLanguage } from "../i18n/language";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ELEMENTARY_TET_PASS_MARK, HIGH_SCHOOL_TET_PASS_MARK, SHOW_ADDRESS, SHOW_MEMBER_ID, SHOW_PINCODE } from "../config/features";

interface SeniorityTableProps {
  rows: any[];
  schoolType: "high" | "elementary" | "clergy";
  sortMode?: "seniority" | "appointment";
  onSortModeChange?: (mode: "seniority" | "appointment") => void;
  sortingPulse?: boolean;
  onRowDoubleClick?: (candidate: any) => void;
  showAppointments?: boolean;
}

function formatDateWithAge(value: any) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const age = differenceInYears(new Date(), date);
  const ageText = Number.isFinite(age) && age >= 0 ? ` (${age})` : "";
  return `${format(date, "dd MMM yyyy")}${ageText}`;
}

function formatDateOnly(value: any) {
  if (!value) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : format(value, "dd/MM/yyyy");
  }

  const raw = String(value).trim();
  if (!raw) return "";

  const compact = raw.replace(/\s+/g, "");
  const normalized = compact.replace(/[./-]+/g, ".");
  const match = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const yearRaw = Number(match[3]);
    const year = String(match[3]).length == 2 ? (yearRaw <= 30 ? 2000 + yearRaw : 1900 + yearRaw) : yearRaw;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? "" : format(date, "dd/MM/yyyy");
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : format(parsed, "dd/MM/yyyy");
}

function splitQualifications(value: string) {
  return (value || "")
    .split("-")
    .map((q) => q.trim())
    .filter(Boolean);
}

function elementaryCategoryClass(category: string) {
  const normalized = String(category || "").toLowerCase();
  if (normalized === "lay") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (normalized === "church worker") {
    return "bg-sky-50 text-sky-700 border-sky-200";
  }
  return "bg-slate-50 text-slate-700 border-slate-200";
}

export function SeniorityTable({ rows, schoolType, sortMode, onSortModeChange, sortingPulse, onRowDoubleClick, showAppointments = false }: SeniorityTableProps) {
  const { t } = useLanguage();
  const highSchool = schoolType === "high";
  const clergy = schoolType === "clergy";

  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const lastTapRef = useRef(0);

  const appointmentColSpan = showAppointments ? 3 : 0;
  const highColSpan = 11 + appointmentColSpan + (SHOW_MEMBER_ID ? 1 : 0) + (SHOW_ADDRESS ? 1 : 0) + (SHOW_PINCODE ? 1 : 0);
  const elementaryColSpan = 11 + appointmentColSpan + (SHOW_MEMBER_ID ? 1 : 0);
  const clergyColSpan = 7 + appointmentColSpan + (SHOW_MEMBER_ID ? 1 : 0);

  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortWrapRef = useRef<HTMLDivElement | null>(null);
  const sortButtonRef = useRef<HTMLButtonElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const [sortMenuPosition, setSortMenuPosition] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (sortWrapRef.current?.contains(target)) return;
      if (sortMenuRef.current?.contains(target)) return;
      setSortMenuOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [sortMenuOpen]);

  useEffect(() => {
    if (!sortMenuOpen) return;
    const updateMenuPosition = () => {
      const rect = sortButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setSortMenuPosition({ left: rect.left, top: rect.bottom + 6 });
    };
    updateMenuPosition();
    window.addEventListener("scroll", updateMenuPosition, true);
    window.addEventListener("resize", updateMenuPosition);
    return () => {
      window.removeEventListener("scroll", updateMenuPosition, true);
      window.removeEventListener("resize", updateMenuPosition);
    };
  }, [sortMenuOpen]);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const triggerRowAction = (candidate: any) => {
    onRowDoubleClick?.(candidate);
  };

  const handlePointerDown = (event: any, candidate: any) => {
    if (!onRowDoubleClick) return;
    if (event.pointerType !== "touch") return;
    longPressFiredRef.current = false;
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      triggerRowAction(candidate);
    }, 550);
  };

  const handlePointerUp = (event: any, candidate: any) => {
    if (!onRowDoubleClick) return;
    if (event.pointerType !== "touch") return;
    clearLongPress();
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      triggerRowAction(candidate);
      return;
    }
    lastTapRef.current = now;
  };

  const handlePointerCancel = (event: any) => {
    if (event.pointerType !== "touch") return;
    clearLongPress();
    longPressFiredRef.current = false;
  };

  const rankHeader = (
    <TableHead className="w-32 font-semibold h-10 align-middle">
      <div className={`flex items-center gap-2 ${sortingPulse ? "animate-pulse" : ""}`}>
        <span className="text-[12px] leading-3">{t("Rank", "வரிசை")}</span>
        {onSortModeChange && sortMode ? (
          <div ref={sortWrapRef} className="relative">
            <button
              type="button"
              ref={sortButtonRef}
              className="h-6 rounded border border-blue-200 bg-blue-50 px-2 text-[10px] font-semibold text-blue-700 shadow-sm dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-200 flex items-center gap-1.5"
              onClick={() => setSortMenuOpen((v) => !v)}
            >
              <span>{t("Sort by", "வரிசைப்படுத்து")}</span>
              <ChevronDown className="h-3 w-3 text-blue-600/70 shrink-0" />
            </button>
            {sortMenuOpen && sortMenuPosition ? createPortal(
              <div
                ref={sortMenuRef}
                className="z-[9999] w-44 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700 flex flex-col"
                style={{ position: "fixed", left: sortMenuPosition.left, top: sortMenuPosition.top }}
              >
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                  onClick={() => { onSortModeChange("seniority"); setSortMenuOpen(false); }}
                >
                  {t("Seniority", "மூப்பு")}
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                  onClick={() => { onSortModeChange("appointment"); setSortMenuOpen(false); }}
                >
                  {t("Appointment", "நியமனம்")}
                </button>
              </div>,
              document.body
            ) : null}
          </div>
        ) : null}
      </div>
    </TableHead>
  );

    const plainRankHeader = (
    <TableHead className={`w-20 font-semibold ${sortingPulse ? "animate-pulse" : ""}`}>{t("Rank", "வரிசை")}</TableHead>
  );

  return (
    <div className="glass-panel seniority-table-panel rounded-lg border border-gray-200 shadow-sm">
      <Table className={highSchool ? "min-w-[1100px]" : clergy ? "min-w-[1000px]" : "min-w-[1200px]"}>
      <TableHeader>
        <TableRow className="bg-gray-50">
          {highSchool ? (
            <>
              {rankHeader}
              {SHOW_MEMBER_ID ? <TableHead className="font-semibold">{t("Member ID", "உறுப்பினர் ஐடி")}</TableHead> : null}
              <TableHead className="font-semibold">{t("Name", "பெயர்")}</TableHead>
              <TableHead className="font-semibold">{t("Date of Birth", "பிறந்த தேதி")}</TableHead>
              <TableHead className="font-semibold">{t("Category", "வகை")}</TableHead>
              <TableHead className="font-semibold">{t("Department", "துறை")}</TableHead>
              <TableHead className="font-semibold">{t("Qualification", "தகுதி")}</TableHead>
              <TableHead className="font-semibold">{t("Year of Passing", "தேர்ச்சி ஆண்டு")}</TableHead>
              <TableHead className="font-semibold">{t("Year of Registering", "பதிவு ஆண்டு")}</TableHead>
              <TableHead className="font-semibold">{t("TET Qualified", "TET தகுதி")}</TableHead>
              {SHOW_ADDRESS ? <TableHead className="font-semibold">{t("Address", "முகவரி")}</TableHead> : null}
              {SHOW_PINCODE ? <TableHead className="font-semibold">{t("Pincode", "அஞ்சல் குறியீடு")}</TableHead> : null}
              <TableHead className="font-semibold">{t("Pastorate", "பாஸ்டரேட்")}</TableHead>
              <TableHead className="font-semibold">{t("Council", "கவுன்சில்")}</TableHead>
              {showAppointments ? (
              <>
                <TableHead className="font-semibold">{t("Appointment Date", "நியமன தேதி")}</TableHead>
                <TableHead className="font-semibold">{t("Vacancy Institute", "காலியிடம் நிறுவனம்")}</TableHead>
                <TableHead className="font-semibold">{t("Based on", "அடிப்படையில்")}</TableHead>
              </>
            ) : null}
            </>
          ) : clergy ? (
            <>
              {plainRankHeader}
              {SHOW_MEMBER_ID ? <TableHead className="font-semibold">{t("Member ID", "உறுப்பினர் ஐடி")}</TableHead> : null}
              <TableHead className="font-semibold">{t("Name", "பெயர்")}</TableHead>
              <TableHead className="font-semibold">{t("Date of Birth", "பிறந்த தேதி")}</TableHead>
              <TableHead className="font-semibold">{t("Year of Passing", "தேர்ச்சி ஆண்டு")}</TableHead>
              <TableHead className="font-semibold">{t("Years of Experience", "பணியாண்டுகள்")}</TableHead>
              <TableHead className="font-semibold">{t("Qualification", "தகுதி")}</TableHead>
              <TableHead className="font-semibold">{t("Home Pastorate", "சொந்த பாஸ்டரேட்")}</TableHead>
              {showAppointments ? (
              <>
                <TableHead className="font-semibold">{t("Appointment Date", "நியமன தேதி")}</TableHead>
                <TableHead className="font-semibold">{t("Vacancy Institute", "காலியிடம் நிறுவனம்")}</TableHead>
                <TableHead className="font-semibold">{t("Based on", "அடிப்படையில்")}</TableHead>
              </>
            ) : null}
            </>
          ) : (
            <>
              {rankHeader}
              {SHOW_MEMBER_ID ? <TableHead className="font-semibold">{t("Member ID", "உறுப்பினர் ஐடி")}</TableHead> : null}
              <TableHead className="font-semibold">{t("Name", "பெயர்")}</TableHead>
              <TableHead className="font-semibold">{t("Date of Birth", "பிறந்த தேதி")}</TableHead>
              <TableHead className="font-semibold">{t("Year of Passing", "தேர்ச்சி ஆண்டு")}</TableHead>
              <TableHead className="font-semibold">{t("Year of Registering", "பதிவு ஆண்டு")}</TableHead>
              <TableHead className="font-semibold">{t("Qualification", "தகுதி")}</TableHead>
              <TableHead className="font-semibold">{t("TET Qualified", "TET தகுதி")}</TableHead>
              <TableHead className="font-semibold">{t("Category", "வகை")}</TableHead>
              <TableHead className="font-semibold">{t("Subject", "பாடம்")}</TableHead>
              <TableHead className="font-semibold">{t("Pastorate", "பாஸ்டரேட்")}</TableHead>
              <TableHead className="font-semibold">{t("Council", "கவுன்சில்")}</TableHead>
              {showAppointments ? (
              <>
                <TableHead className="font-semibold">{t("Appointment Date", "நியமன தேதி")}</TableHead>
                <TableHead className="font-semibold">{t("Vacancy Institute", "காலியிடம் நிறுவனம்")}</TableHead>
                <TableHead className="font-semibold">{t("Based on", "அடிப்படையில்")}</TableHead>
              </>
            ) : null}
            </>
          )}
        </TableRow>
      </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={highSchool ? highColSpan : clergy ? clergyColSpan : elementaryColSpan}
                  className="text-center py-12 text-gray-500"
                >
                  {t("No candidates found matching your criteria", "உங்கள் நிபந்தனைகளுக்கு ஏற்ப விண்ணப்பதாரர்கள் இல்லை")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((candidate, index) => {
                const isAppointed = candidate.appointed === true;
                const rankValue = isAppointed && !showAppointments ? "" : candidate.rank;
                const appointmentNumber = showAppointments ? candidate.appointmentNumber : null;
                const appointedBadge = showAppointments && isAppointed && appointmentNumber ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                    {appointmentNumber}
                  </span>
                ) : null;
                const elementaryTetPass =
                  candidate.tetQualified === true ||
                  (Number.isFinite(candidate.tetCompletion) && Number(candidate.tetCompletion) >= ELEMENTARY_TET_PASS_MARK);
                const elementaryTetLabel = elementaryTetPass ? t("Pass", "தேர்ச்சி") : t("No", "இல்லை");
                const rowClassName = `optimized-row ${showAppointments && isAppointed ? "bg-emerald-50/70 dark:bg-emerald-900/20 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/30" : "hover:bg-slate-100/70 dark:hover:bg-slate-800/70"} ${onRowDoubleClick ? "cursor-pointer" : ""}`;
                return (
                  <TableRow
                  key={[
                    schoolType,
                    candidate.id || "",
                    candidate.memberId || "",
                    candidate.name || "",
                    candidate.department || "",
                    candidate.category || "",
                    candidate.yearOfRegistering || "",
                    String(index),
                  ].join("|")}
                  onDoubleClick={() => onRowDoubleClick?.(candidate)}
                  onPointerDown={(e) => handlePointerDown(e, candidate)}
                  onPointerUp={(e) => handlePointerUp(e, candidate)}
                  onPointerCancel={handlePointerCancel}
                  onPointerLeave={handlePointerCancel}
                  className={rowClassName}
                >
                  {highSchool ? (
                    <>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${sortingPulse ? "animate-pulse" : ""}`}>
                          <span className="font-semibold text-gray-900">{rankValue}</span>
                          {appointedBadge}
                        </div>
                      </TableCell>
                      {SHOW_MEMBER_ID ? <TableCell>{candidate.memberId || ""}</TableCell> : null}
                      <TableCell className="font-medium text-gray-900 table-responsive-cell">{candidate.name}</TableCell>
                      <TableCell className="text-gray-700">{formatDateWithAge(candidate.dateOfBirth)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {candidate.category || ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{candidate.department || ""}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-700 table-responsive-cell">
                        <div className="flex flex-wrap gap-1">
                          {splitQualifications(candidate.qualification).map((q) => (
                            <Badge key={`${candidate.id || candidate.memberId}-${q}`} variant="outline" className="bg-white">
                              {q}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">{candidate.yearOfPassing}</TableCell>
                      <TableCell className="text-gray-700">{candidate.yearOfRegistering}</TableCell>
                      <TableCell>
                        {String(candidate.category || "").toUpperCase().includes("UG") ? (
                          <Badge
                            variant="outline"
                            className={
                              Number.isFinite(candidate.tetScore)
                                ? Number(candidate.tetScore) >= HIGH_SCHOOL_TET_PASS_MARK
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                                : candidate.tetQualified === true
                                ? "bg-green-50 text-green-700 border-green-200"
                                : candidate.tetQualified === false
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }
                          >
                            {Number.isFinite(candidate.tetScore)
                              ? `${candidate.tetScore}${Number.isFinite(candidate.tetYear) ? ` (${candidate.tetYear})` : ""}`
                              : candidate.tetRaw || (candidate.tetQualified === true
                              ? "Yes"
                              : candidate.tetQualified === false
                              ? "No"
                              : "-")}
                          </Badge>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      {SHOW_ADDRESS ? <TableCell className="text-gray-700 table-responsive-cell">{candidate.address || "-"}</TableCell> : null}
                      {SHOW_PINCODE ? <TableCell className="text-gray-700">{candidate.pincode || "-"}</TableCell> : null}
                      <TableCell className="text-gray-700 table-responsive-cell">{candidate.pastorate || "-"}</TableCell>
                      <TableCell className="text-gray-700 table-responsive-cell">{candidate.council || "-"}</TableCell>
                      {showAppointments ? (
                      <>
                        <TableCell className="text-gray-700">{candidate.appointedDate ? formatDateOnly(candidate.appointedDate) : "-"}</TableCell>
                        <TableCell className="text-gray-700 table-responsive-cell">{candidate.appointedLocation || candidate.appointedSchool || candidate.institution || "-"}</TableCell>
                        <TableCell className="text-gray-700">{candidate.compassionReason || "-"}</TableCell>
                      </>
                    ) : null}
                    </>
                  ) : clergy ? (
                    <>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${sortingPulse ? "animate-pulse" : ""}`}>
                          <span className="font-semibold text-gray-900">{rankValue}</span>
                          {appointedBadge}
                        </div>
                      </TableCell>
                      {SHOW_MEMBER_ID ? <TableCell>{candidate.memberId || ""}</TableCell> : null}
                      <TableCell className="font-medium text-gray-900 table-responsive-cell">{candidate.name}</TableCell>
                      <TableCell className="text-gray-700">{formatDateWithAge(candidate.dateOfBirth)}</TableCell>
                      <TableCell className="text-gray-700">{candidate.yearOfPassing ?? ""}</TableCell>
                      <TableCell className="text-gray-700">{candidate.yearsOfExperience ?? ""}</TableCell>
                      <TableCell className="text-gray-700 table-responsive-cell">
                        <div className="flex flex-wrap gap-1">
                          {splitQualifications(candidate.qualification).map((q) => (
                            <Badge key={`${candidate.id || candidate.memberId}-${q}`} variant="outline" className="bg-white">
                              {q}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700 table-responsive-cell">{candidate.homePastorate || ""}</TableCell>
                      {showAppointments ? (
                      <>
                        <TableCell className="text-gray-700">{candidate.appointedDate ? formatDateOnly(candidate.appointedDate) : "-"}</TableCell>
                        <TableCell className="text-gray-700 table-responsive-cell">{candidate.appointedLocation || candidate.appointedSchool || candidate.institution || "-"}</TableCell>
                        <TableCell className="text-gray-700">{candidate.compassionReason || "-"}</TableCell>
                      </>
                    ) : null}
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${sortingPulse ? "animate-pulse" : ""}`}>
                          <span className="font-semibold text-gray-900">{rankValue}</span>
                          {appointedBadge}
                        </div>
                      </TableCell>
                      {SHOW_MEMBER_ID ? <TableCell>{candidate.memberId || ""}</TableCell> : null}
                      <TableCell className="font-medium text-gray-900 table-responsive-cell">{candidate.name}</TableCell>
                      <TableCell className="text-gray-700">{formatDateWithAge(candidate.dateOfBirth)}</TableCell>
                      <TableCell className="text-gray-700">{candidate.yearOfPassing ?? ""}</TableCell>
                      <TableCell className="text-gray-700">{candidate.yearOfRegistering ?? ""}</TableCell>
                      <TableCell className="text-gray-700 table-responsive-cell">
                        <div className="flex flex-wrap gap-1">
                          {splitQualifications(candidate.qualification).map((q) => (
                            <Badge key={`${candidate.id || candidate.memberId}-${q}`} variant="outline" className="bg-white">
                              {q}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={elementaryTetPass ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}
                        >
                          {elementaryTetLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={elementaryCategoryClass(candidate.category)}
                        >
                          {candidate.category || ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-700">{candidate.subject || candidate.level || ""}</TableCell>
                      <TableCell className="text-gray-700 table-responsive-cell">{candidate.pastorate || ""}</TableCell>
                      <TableCell className="text-gray-700 table-responsive-cell">{candidate.council || ""}</TableCell>
                      {showAppointments ? (
                      <>
                        <TableCell className="text-gray-700">{candidate.appointedDate ? formatDateOnly(candidate.appointedDate) : "-"}</TableCell>
                        <TableCell className="text-gray-700 table-responsive-cell">{candidate.appointedLocation || candidate.appointedSchool || candidate.institution || "-"}</TableCell>
                        <TableCell className="text-gray-700">{candidate.compassionReason || "-"}</TableCell>
                      </>
                    ) : null}
                    </>
                  )}
                </TableRow>
              );
            })

            )}
          </TableBody>
      </Table>
    </div>
  );
}
