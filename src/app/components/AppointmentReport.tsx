import { differenceInYears, format } from "date-fns";
import { Button } from "./ui/button";
import { Award } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useLanguage } from "../i18n/language";

type SchoolType = "high" | "elementary" | "clergy";

interface AppointmentReportProps {
  rows: any[];
  schoolType: SchoolType;
  onDownload: () => void;
  downloading: boolean;
}

function formatDateWithAge(value: any) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const age = differenceInYears(new Date(), date);
  const ageText = Number.isFinite(age) && age >= 0 ? ` (${age})` : "";
  return `${format(date, "dd MMM yyyy")}${ageText}`;
}

export function AppointmentReport({
  rows,
  schoolType,
  onDownload,
  downloading,
}: AppointmentReportProps) {
  const { t } = useLanguage();
  const isHigh = schoolType === "high";
  const isElementary = schoolType === "elementary";
  const emptyColSpan = isHigh ? 17 : isElementary ? 15 : 11;

  return (
    <section className="glass-panel border border-gray-200 rounded-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-900">
          {t("Appointments Made Report", "நியமன அறிக்கை")}
        </h3>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
          onClick={onDownload}
          disabled={downloading || rows.length === 0}
        >
          {downloading ? t("Preparing Report...", "அறிக்கை தயாராகிறது...") : t("Download Report", "அறிக்கை பதிவிறக்கம்")}
        </Button>
      </div>

      <p className="text-xs sm:text-sm text-gray-600 mb-3">
        {t("Appointed entries found", "நியமிக்கப்பட்ட பதிவுகள்")}: {rows.length}
      </p>

      <div className="overflow-x-auto">
        <Table className={isHigh ? "min-w-[1700px]" : isElementary ? "min-w-[1500px]" : "min-w-[1300px]"}>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>{t("Rank", "வரிசை")}</TableHead>
              <TableHead>{t("Member ID", "உறுப்பினர் ஐடி")}</TableHead>
              <TableHead>{t("Name", "பெயர்")}</TableHead>
              <TableHead>{t("Date of Birth", "பிறந்த தேதி")}</TableHead>
              {isHigh || isElementary ? <TableHead>{t("Year of Passing", "தேர்ச்சி ஆண்டு")}</TableHead> : null}
              {isHigh || isElementary ? <TableHead>{t("Year of Registering", "பதிவு ஆண்டு")}</TableHead> : null}
              {isHigh ? <TableHead>{t("Department", "துறை")}</TableHead> : null}
              {isHigh || isElementary ? <TableHead>{t("Category", "வகை")}</TableHead> : null}
              {isElementary ? <TableHead>{t("Level", "நிலை")}</TableHead> : null}
              {isHigh ? <TableHead>{t("TET Qualified", "TET தகுதி")}</TableHead> : null}
              {isElementary ? <TableHead>{t("TET Qualification", "TET தகுதி")}</TableHead> : null}
              {!isHigh && !isElementary ? <TableHead>{t("Year of Passing", "தேர்ச்சி ஆண்டு")}</TableHead> : null}
              {!isHigh && !isElementary ? <TableHead>{t("Years of Experience", "பணியாண்டுகள்")}</TableHead> : null}
              <TableHead>{t("Qualification", "தகுதி")}</TableHead>
              {isHigh ? <TableHead>{t("Address", "முகவரி")}</TableHead> : null}
              {isHigh ? <TableHead>{t("Pincode", "அஞ்சல் குறியீடு")}</TableHead> : null}
              {isHigh || isElementary ? <TableHead>{t("Pastorate", "பாஸ்டரேட்")}</TableHead> : null}
              {isHigh || isElementary ? <TableHead>{t("Council", "கவுன்சில்")}</TableHead> : null}
              {!isHigh && !isElementary ? <TableHead>{t("Home Pastorate", "சொந்த பாஸ்டரேட்")}</TableHead> : null}
              <TableHead>{t("Appointed", "நியமிக்கப்பட்டது")}</TableHead>
              <TableHead>{t("Appointed Date", "நியமன தேதி")}</TableHead>
              <TableHead>{t("Compassion Based Reason", "இரக்க அடிப்படை காரணம்")}</TableHead>
              <TableHead>{t("Appointed Location", "நியமன இடம்")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={emptyColSpan} className="text-center py-8 text-gray-500">
                  {t("No appointments marked as Yes.", "Yes என நியமனம் குறிக்கப்பட்ட பதிவுகள் இல்லை.")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, idx) => (
                <TableRow key={`${row.id || row.memberId || "appointment"}-${idx}`}>
                  <TableCell>
  <div className="flex items-center gap-2">
    {row.rank === 1 ? <Award className="w-4 h-4 text-yellow-500" /> : null}
    <span className="font-semibold text-gray-900">{row.rank ?? ""}</span>
  </div>
</TableCell>
                  <TableCell>{row.memberId || ""}</TableCell>
                  <TableCell>{row.name || ""}</TableCell>
                  <TableCell>{formatDateWithAge(row.dateOfBirth)}</TableCell>
                  {isHigh || isElementary ? <TableCell>{row.yearOfPassing ?? ""}</TableCell> : null}
                  {isHigh || isElementary ? <TableCell>{row.yearOfRegistering ?? ""}</TableCell> : null}
                  {isHigh ? <TableCell>{row.department || ""}</TableCell> : null}
                  {isHigh || isElementary ? <TableCell>{row.category || ""}</TableCell> : null}
                  {isElementary ? <TableCell>{row.level || ""}</TableCell> : null}
                  {isHigh ? <TableCell>{row.tetRaw || (row.tetQualified === true ? "Yes" : row.tetQualified === false ? "No" : "-")}</TableCell> : null}
                  {isElementary ? <TableCell>{Number.isFinite(row.tetCompletion) ? `${row.tetCompletion}%` : "-"}</TableCell> : null}
                  {!isHigh && !isElementary ? <TableCell>{row.yearOfPassing ?? ""}</TableCell> : null}
                  {!isHigh && !isElementary ? <TableCell>{row.yearsOfExperience ?? ""}</TableCell> : null}
                  <TableCell>{row.qualification || ""}</TableCell>
                  {isHigh ? <TableCell>{row.address || "-"}</TableCell> : null}
                  {isHigh ? <TableCell>{row.pincode || "-"}</TableCell> : null}
                  {isHigh || isElementary ? <TableCell>{row.pastorate || ""}</TableCell> : null}
                  {isHigh || isElementary ? <TableCell>{row.council || ""}</TableCell> : null}
                  {!isHigh && !isElementary ? <TableCell>{row.homePastorate || ""}</TableCell> : null}
                  <TableCell>{row.appointed ? "Yes" : "No"}</TableCell>
                  <TableCell>{row.appointedDate || "-"}</TableCell>
                  <TableCell>{row.compassionReason || "-"}</TableCell>
                  <TableCell>{row.appointedLocation || "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
