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
import { Award } from "lucide-react";
import { useLanguage } from "../i18n/language";
import { ELEMENTARY_TET_PASS_MARK, HIGH_SCHOOL_TET_PASS_MARK } from "../config/features";

interface SeniorityTableProps {
  rows: any[];
  schoolType: "high" | "elementary" | "clergy";
  sortMode?: "seniority" | "appointment";
  onSortModeChange?: (mode: "seniority" | "appointment") => void;
  sortingPulse?: boolean;
}

function formatDateWithAge(value: any) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const age = differenceInYears(new Date(), date);
  const ageText = Number.isFinite(age) && age >= 0 ? ` (${age})` : "";
  return `${format(date, "dd MMM yyyy")}${ageText}`;
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

export function SeniorityTable({ rows, schoolType, sortMode, onSortModeChange, sortingPulse }: SeniorityTableProps) {
  const { t } = useLanguage();
  const highSchool = schoolType === "high";
  const clergy = schoolType === "clergy";

  const rankHeader = (
    <TableHead className="w-32 font-semibold align-top">
      <div className={`flex flex-col gap-2 ${sortingPulse ? "animate-pulse" : ""}`}>
        <span className="leading-none">{t("Rank", "வரிசை")}</span>
        {onSortModeChange && sortMode ? (
          <div className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
            <span className="uppercase tracking-wide text-[10px] text-slate-400">{t("Sort by", "வரிசைப்படுத்து")}</span>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="rank-sort"
                className="h-3.5 w-3.5 accent-blue-600"
                checked={sortMode === "seniority"}
                onChange={() => onSortModeChange("seniority")}
              />
              <span>{t("Seniority", "மூப்பு")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="rank-sort"
                className="h-3.5 w-3.5 accent-blue-600"
                checked={sortMode === "appointment"}
                onChange={() => onSortModeChange("appointment")}
              />
              <span>{t("Appointment", "நியமனம்")}</span>
            </label>
          </div>
        ) : null}
      </div>
    </TableHead>
  );

  const plainRankHeader = (
    <TableHead className={`w-20 font-semibold ${sortingPulse ? "animate-pulse" : ""}`}>{t("Rank", "வரிசை")}</TableHead>
  );

  return (
    <div className="glass-panel rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <Table className={highSchool ? "min-w-[1100px]" : clergy ? "min-w-[1000px]" : "min-w-[1200px]"}>
      <TableHeader>
        <TableRow className="bg-gray-50">
          {highSchool ? (
            <>
              {rankHeader}
              <TableHead className="font-semibold">{t("Member ID", "உறுப்பினர் ஐடி")}</TableHead>
              <TableHead className="font-semibold">{t("Name", "பெயர்")}</TableHead>
              <TableHead className="font-semibold">{t("Date of Birth", "பிறந்த தேதி")}</TableHead>
              <TableHead className="font-semibold">{t("Category", "வகை")}</TableHead>
              <TableHead className="font-semibold">{t("Department", "துறை")}</TableHead>
              <TableHead className="font-semibold">{t("Qualification", "தகுதி")}</TableHead>
              <TableHead className="font-semibold">{t("Year of Passing", "தேர்ச்சி ஆண்டு")}</TableHead>
              <TableHead className="font-semibold">{t("Year of Registering", "பதிவு ஆண்டு")}</TableHead>
              <TableHead className="font-semibold">{t("TET Qualified", "TET தகுதி")}</TableHead>
              <TableHead className="font-semibold">{t("Address", "முகவரி")}</TableHead>
              <TableHead className="font-semibold">{t("Pincode", "அஞ்சல் குறியீடு")}</TableHead>
              <TableHead className="font-semibold">{t("Pastorate", "பாஸ்டரேட்")}</TableHead>
              <TableHead className="font-semibold">{t("Council", "கவுன்சில்")}</TableHead>
            </>
          ) : clergy ? (
            <>
              {plainRankHeader}
              <TableHead className="font-semibold">{t("Member ID", "உறுப்பினர் ஐடி")}</TableHead>
              <TableHead className="font-semibold">{t("Name", "பெயர்")}</TableHead>
              <TableHead className="font-semibold">{t("Date of Birth", "பிறந்த தேதி")}</TableHead>
              <TableHead className="font-semibold">{t("Year of Passing", "தேர்ச்சி ஆண்டு")}</TableHead>
              <TableHead className="font-semibold">{t("Years of Experience", "பணியாண்டுகள்")}</TableHead>
              <TableHead className="font-semibold">{t("Qualification", "தகுதி")}</TableHead>
              <TableHead className="font-semibold">{t("Home Pastorate", "சொந்த பாஸ்டரேட்")}</TableHead>
            </>
          ) : (
            <>
              {rankHeader}
              <TableHead className="font-semibold">{t("Member ID", "உறுப்பினர் ஐடி")}</TableHead>
              <TableHead className="font-semibold">{t("Name", "பெயர்")}</TableHead>
              <TableHead className="font-semibold">{t("Date of Birth", "பிறந்த தேதி")}</TableHead>
              <TableHead className="font-semibold">{t("Year of Passing", "தேர்ச்சி ஆண்டு")}</TableHead>
              <TableHead className="font-semibold">{t("Year of Registering", "பதிவு ஆண்டு")}</TableHead>
              <TableHead className="font-semibold">{t("Qualification", "தகுதி")}</TableHead>
              <TableHead className="font-semibold">{t("TET Qualification", "TET தகுதி")}</TableHead>
              <TableHead className="font-semibold">{t("Category", "வகை")}</TableHead>
              <TableHead className="font-semibold">{t("Level", "நிலை")}</TableHead>
              <TableHead className="font-semibold">{t("Pastorate", "பாஸ்டரேட்")}</TableHead>
              <TableHead className="font-semibold">{t("Council", "கவுன்சில்")}</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={highSchool ? 14 : clergy ? 8 : 12}
                  className="text-center py-12 text-gray-500"
                >
                  {t("No candidates found matching your criteria", "உங்கள் நிபந்தனைகளுக்கு ஏற்ப விண்ணப்பதாரர்கள் இல்லை")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((candidate, index) => (
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
                  className="optimized-row hover:bg-slate-100/70 dark:hover:bg-slate-800/70"
                >
                  {highSchool ? (
                    <>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${sortingPulse ? "animate-pulse" : ""}`}>
                          {candidate.rank === 1 && <Award className="w-4 h-4 text-yellow-500" />}
                          <span className="font-semibold text-gray-900">{candidate.rank}</span>
                        </div>
                      </TableCell>
                      <TableCell>{candidate.memberId || ""}</TableCell>
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
                      <TableCell className="text-gray-700 table-responsive-cell">{candidate.address || "-"}</TableCell>
                      <TableCell className="text-gray-700">{candidate.pincode || "-"}</TableCell>
                      <TableCell className="text-gray-700 table-responsive-cell">{candidate.pastorate || "-"}</TableCell>
                      <TableCell className="text-gray-700 table-responsive-cell">{candidate.council || "-"}</TableCell>
                    </>
                  ) : clergy ? (
                    <>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${sortingPulse ? "animate-pulse" : ""}`}>
                          {candidate.rank === 1 && <Award className="w-4 h-4 text-yellow-500" />}
                          <span className="font-semibold text-gray-900">{candidate.rank}</span>
                        </div>
                      </TableCell>
                      <TableCell>{candidate.memberId || ""}</TableCell>
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
                    </>
                  ) : (
                    <>
                      <TableCell>
                        <div className={`flex items-center gap-2 ${sortingPulse ? "animate-pulse" : ""}`}>
                          {candidate.rank === 1 && <Award className="w-4 h-4 text-yellow-500" />}
                          <span className="font-semibold text-gray-900">{candidate.rank}</span>
                        </div>
                      </TableCell>
                      <TableCell>{candidate.memberId || ""}</TableCell>
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
                          className={
                            Number(candidate.tetCompletion) >= ELEMENTARY_TET_PASS_MARK
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }
                        >
                          {Number.isFinite(candidate.tetCompletion)
                            ? `${candidate.tetCompletion}%${Number(candidate.tetCompletion) >= ELEMENTARY_TET_PASS_MARK ? " (Yes)" : " (No)"}`
                            : "-"}
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
                      <TableCell className="text-gray-700">{candidate.level || ""}</TableCell>
                      <TableCell className="text-gray-700 table-responsive-cell">{candidate.pastorate || ""}</TableCell>
                      <TableCell className="text-gray-700 table-responsive-cell">{candidate.council || ""}</TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
      </Table>
    </div>
  );
}
