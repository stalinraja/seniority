import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ELEMENTARY_TET_PASS_MARK, SHOW_ADDRESS, SHOW_MEMBER_ID, SHOW_PINCODE } from "../config/features";
import {
  compareClergyOrdinationCandidates,
  compareElementarySchoolCandidates,
  compareElementarySchoolSeniorityCandidates,
  compareHighSchoolCandidates,
  compareHighSchoolSeniorityCandidates,
} from "../config/seniorityRules";

type SchoolType = "high" | "elementary" | "clergy";

type PdfColumn = {
  key: string;
  title: string;
  align?: "left" | "center" | "right";
  minWidth: number;
  weight: number;
  keepAlways?: boolean;
  wrap?: boolean;
  getValue?: (c: any) => any;
};

// --- HELPERS ---

function extractPassingYear(value: any): number | null {
  if (!value) return null;
  const fourDigit = String(value).match(/\b(19|20)\d{2}\b/);
  if (fourDigit) return Number(fourDigit[0]);
  const twoDigit = String(value).match(/\b(\d{2})\b/);
  if (!twoDigit) return null;
  const yy = Number(twoDigit[1]);
  return yy <= 30 ? 2000 + yy : 1900 + yy;
}

function candidateKey(candidate: any) {
  const dob = candidate.dateOfBirth instanceof Date ? candidate.dateOfBirth.toISOString() : String(candidate.dateOfBirth || "");
  return [candidate.id || "", candidate.memberId || "", candidate.name || "", dob].join("|");
}

function getMemberIdColumn(): PdfColumn[] {
  return SHOW_MEMBER_ID
    ? [{ key: "memberId", title: "Member ID", align: "center", minWidth: 18, weight: 1.2, keepAlways: true, getValue: (c: any) => c.memberId || "" }]
    : [];
}

function getAddressColumn(): PdfColumn[] {
  return SHOW_ADDRESS
    ? [{ key: "address", title: "Address", minWidth: 32, weight: 2.2, wrap: true, getValue: (c: any) => c.address || "-" }]
    : [];
}

function getPincodeColumn(): PdfColumn[] {
  return SHOW_PINCODE
    ? [{ key: "pincode", title: "Pincode", align: "center", minWidth: 14, weight: 1, getValue: (c: any) => c.pincode || "-" }]
    : [];
}

function buildRankMap(candidates: any[], schoolType: SchoolType, mode: "seniority" | "appointment") {
  const list = [...candidates];
  const compare =
    schoolType === "high"
      ? mode === "appointment"
        ? (a: any, b: any) => compareHighSchoolCandidates(a, b, extractPassingYear)
        : (a: any, b: any) => compareHighSchoolSeniorityCandidates(a, b, extractPassingYear)
      : schoolType === "elementary"
      ? mode === "appointment"
        ? (a: any, b: any) => compareElementarySchoolCandidates(a, b, extractPassingYear)
        : (a: any, b: any) => compareElementarySchoolSeniorityCandidates(a, b, extractPassingYear)
      : (a: any, b: any) => compareClergyOrdinationCandidates(a, b, extractPassingYear);
  list.sort(compare);
  const map = new Map<string, number>();
  list.forEach((candidate, idx) => {
    map.set(candidateKey(candidate), idx + 1);
  });
  return map;
}

function formatDateForPdf(value: any) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function splitQualifications(value: string) {
  return String(value || "").split("-").map((q) => q.trim()).filter(Boolean).join(" | ");
}

function getElementaryTetDisplay(candidate: any) {
  const qualified =
    candidate.tetQualified === true ||
    (Number.isFinite(candidate.tetCompletion) && Number(candidate.tetCompletion) >= ELEMENTARY_TET_PASS_MARK);
  return qualified ? "Pass" : "No";
}

function getTetDisplay(candidate: any) {
  if (!String(candidate.category || "").toUpperCase().includes("UG")) return "-";
  if (Number.isFinite(candidate.tetScore)) {
    return `${candidate.tetScore}${Number.isFinite(candidate.tetYear) ? ` (${candidate.tetYear})` : ""}`;
  }
  return "-";
}

function hasMeaningfulValue(value: string | number) {
  if (typeof value === "number") return Number.isFinite(value);
  const normalized = String(value || "").trim();
  if (!normalized || normalized === "-" || normalized.toLowerCase() === "unknown") return false;
  return true;
}

// --- COLUMN DEFINITIONS ---

function getHighColumns(): PdfColumn[] {
  return [
    { key: "rank", title: "Rank", align: "center", minWidth: 10, weight: 1, keepAlways: true, getValue: (c) => c.rank ?? "" },
    ...getMemberIdColumn(),
    { key: "name", title: "Name", minWidth: 32, weight: 2.4, keepAlways: true, wrap: true, getValue: (c) => c.name || "" },
    { key: "dateOfBirth", title: "Date of Birth", align: "center", minWidth: 20, weight: 1.6, keepAlways: true, getValue: (c) => formatDateForPdf(c.dateOfBirth) },
    { key: "category", title: "Category", align: "center", minWidth: 18, weight: 1.2, keepAlways: true, getValue: (c) => c.category || "" },
    { key: "department", title: "Department", minWidth: 20, weight: 1.5, wrap: true, getValue: (c) => c.department || "" },
    { key: "qualification", title: "Qualification", minWidth: 34, weight: 2.5, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
    { key: "yearOfPassing", title: "Year of Passing", align: "center", minWidth: 16, weight: 1, getValue: (c) => c.yearOfPassing || "" },
    { key: "yearOfRegistering", title: "Year of Registering", align: "center", minWidth: 18, weight: 1, getValue: (c) => c.yearOfRegistering || "" },
    { key: "tet", title: "TET Qualified", align: "center", minWidth: 20, weight: 1.6, getValue: (c) => getTetDisplay(c) },
    ...getAddressColumn(),
    ...getPincodeColumn(),
    { key: "pastorate", title: "Pastorate", minWidth: 22, weight: 1.6, wrap: true, getValue: (c) => c.pastorate || "-" },
    { key: "council", title: "Council", minWidth: 20, weight: 1.5, wrap: true, getValue: (c) => c.council || "-" },
  ];
}

function getElementaryColumns(): PdfColumn[] {
  return [
    { key: "rank", title: "Rank", align: "center", minWidth: 10, weight: 1, keepAlways: true, getValue: (c) => c.rank ?? "" },
    ...getMemberIdColumn(),
    { key: "name", title: "Name", minWidth: 30, weight: 2.3, keepAlways: true, wrap: true, getValue: (c) => c.name || "" },
    { key: "dateOfBirth", title: "DOB", align: "center", minWidth: 18, weight: 1.5, keepAlways: true, getValue: (c) => formatDateForPdf(c.dateOfBirth) },
    { key: "yearOfPassing", title: "Year of Passing", align: "center", minWidth: 16, weight: 1, getValue: (c) => c.yearOfPassing ?? "" },
    { key: "yearOfRegistering", title: "Year of Registering", align: "center", minWidth: 18, weight: 1, getValue: (c) => c.yearOfRegistering ?? "" },
    { key: "qualification", title: "Qualification", minWidth: 36, weight: 2.6, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
    { key: "tet", title: "TET Qualified", align: "center", minWidth: 20, weight: 1.7, getValue: (c) => getElementaryTetDisplay(c) },
    { key: "category", title: "Category", align: "center", minWidth: 16, weight: 1.2, getValue: (c) => c.category || "" },
    { key: "subject", title: "Subject", align: "center", minWidth: 14, weight: 1.1, getValue: (c) => c.subject || c.level || "" },
    { key: "pastorate", title: "Pastorate", minWidth: 22, weight: 1.6, wrap: true, getValue: (c) => c.pastorate || "" },
    { key: "council", title: "Council", minWidth: 20, weight: 1.5, wrap: true, getValue: (c) => c.council || "" },
  ];
}

function getClergyColumns(): PdfColumn[] {
  return [
    { key: "rank", title: "Rank", align: "center", minWidth: 12, weight: 1, keepAlways: true, getValue: (c) => c.rank ?? "" },
    ...getMemberIdColumn(),
    { key: "name", title: "Name", minWidth: 38, weight: 2.4, keepAlways: true, wrap: true, getValue: (c) => c.name || "" },
    { key: "dateOfBirth", title: "DOB", align: "center", minWidth: 22, weight: 1.4, keepAlways: true, getValue: (c) => formatDateForPdf(c.dateOfBirth) },
    { key: "yearOfPassing", title: "Year of Passing", align: "center", minWidth: 18, weight: 1.2, keepAlways: true, getValue: (c) => c.yearOfPassing ?? "" },
    { key: "yearsOfExperience", title: "Years of Experience", align: "center", minWidth: 18, weight: 1.3, keepAlways: true, getValue: (c) => c.yearsOfExperience ?? "" },
    { key: "qualification", title: "Qualification", minWidth: 28, weight: 2, keepAlways: true, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
    { key: "homePastorate", title: "Home Pastorate", minWidth: 30, weight: 2, keepAlways: true, wrap: true, getValue: (c) => c.homePastorate || "" },
  ];
}

function getAppointmentColumns(): PdfColumn[] {
  return [
    { key: "appointedDate", title: "Appointment Date", align: "center", minWidth: 20, weight: 1.4, keepAlways: true, getValue: (c) => (c.appointedDate ? formatDateForPdf(c.appointedDate) : "-") },
    { key: "appointedLocation", title: "Vacancy Institute", minWidth: 28, weight: 2, keepAlways: true, wrap: true, getValue: (c) => c.appointedLocation || c.appointedSchool || c.institution || "-" },
    { key: "compassionReason", title: "Based on", minWidth: 22, weight: 1.8, keepAlways: true, wrap: true, getValue: (c) => c.compassionReason || "-" },
  ];
}

// --- LAYOUT LOGIC ---
function applyPdfFooterAndWatermark(doc: jsPDF, logoDataUrl: string | null, printedAt: string) {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    if (logoDataUrl) {
      doc.saveGraphicsState();
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.05 }));
      doc.addImage(
        logoDataUrl,
        "PNG",
        doc.internal.pageSize.getWidth() / 2 - 35,
        doc.internal.pageSize.getHeight() / 2 - 35,
        70,
        70
      );
      doc.restoreGraphicsState();
    }
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Printed: ${printedAt}`, 10, doc.internal.pageSize.getHeight() - 8);
    doc.text(`Page ${i} of ${totalPages}`, doc.internal.pageSize.getWidth() - 10, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }
}


function buildColumnStyles(doc: jsPDF, columns: PdfColumn[]) {
  const contentWidth = doc.internal.pageSize.getWidth() - 20; // 10mm margins
  const minSum = columns.reduce((sum, col) => sum + col.minWidth, 0);
  const scale = contentWidth / minSum;

  return Object.fromEntries(
    columns.map((col, idx) => [
      idx,
      { 
        cellWidth: col.minWidth * (scale < 1 ? scale : 1.1), // Ensure they fit
        halign: col.align || "left", 
        overflow: col.wrap ? "linebreak" : "hidden" 
      },
    ])
  );
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/diocese-logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// --- MAIN DOWNLOAD FUNCTION ---

export async function downloadCandidatesPDF(
  candidates: any[],
  filters: Record<string, string[]>,
  schoolType: SchoolType = "high",
  sortMode: "seniority" | "appointment" = "seniority",
  searchQuery = "",
  rankBaseCandidates: any[] = []
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logoDataUrl = await loadLogoDataUrl();
  const printedAt = new Date().toLocaleString("en-GB", { dateStyle: 'medium', timeStyle: 'short' });

  // 1. HEADER
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 10, 8, 15, 15);
  doc.text("CSI Thoothukudi-Nazareth Diocese", 28, 15);
  
  doc.setFontSize(11);
  const title = schoolType === "high" ? "High/Higher Secondary Priority List" : schoolType === "elementary" ? "Elementary/Middle Priority List" : "Clergy Priority List";
  doc.text(title, 28, 21);

  // 2. METADATA (Filters & Search)
  let startY = 28;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  const filterText = Object.entries(filters || {}).filter(([_, v]) => v.length).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" | ");
  const metaLines = [
    filterText ? `Filters: ${filterText}` : "Filters: All",
    `Sorted by: ${sortMode.toUpperCase()} ${searchQuery ? `| Search: "${searchQuery}"` : ""}`
  ];

  metaLines.forEach(line => {
    doc.text(line, 10, startY);
    startY += 4.5;
  });

  // 3. COLUMNS & ROWS
  const allColumns = schoolType === "high" ? getHighColumns() : schoolType === "elementary" ? getElementaryColumns() : getClergyColumns();
  let columns = allColumns.filter(col => col.keepAlways || candidates.some(c => hasMeaningfulValue(col.getValue?.(c))));
  let rowsSource = candidates;

  if (searchQuery && searchQuery.trim()) {
    const rankSource = rankBaseCandidates.length ? rankBaseCandidates : candidates;
    const sMap = buildRankMap(rankSource, schoolType, "seniority");
    const aMap = buildRankMap(rankSource, schoolType, "appointment");
    rowsSource = candidates.map(c => ({
      ...c,
      _sRank: sMap.get(candidateKey(c)) || "",
      _aRank: aMap.get(candidateKey(c)) || ""
    }));
    columns = [
      { key: "sRank", title: "S.Rank", align: "center", minWidth: 14, weight: 1, getValue: (c) => c._sRank },
      { key: "aRank", title: "A.Rank", align: "center", minWidth: 14, weight: 1, getValue: (c) => c._aRank },
      ...columns.filter(col => col.key !== "rank")
    ];
  }

  const rows = rowsSource.map((c) => columns.map((col) => col.getValue?.(c) ?? ""));

  // 4. TABLE GENERATION
  autoTable(doc, {
    head: [columns.map(col => col.title)],
    body: rows,
    startY: startY + 2,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7.2, cellPadding: 1.5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, halign: 'center' },
    columnStyles: buildColumnStyles(doc, columns),
    margin: { left: 10, right: 10, bottom: 15 }
  });

  applyPdfFooterAndWatermark(doc, logoDataUrl, printedAt);

  doc.save(`${schoolType}-list-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function downloadAppointmentsReportPDF(
  candidates: any[],
  schoolType: SchoolType = "high",
  searchQuery = ""
) {
  const onlyAppointments = candidates.filter((c) => c.appointed === true);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logoDataUrl = await loadLogoDataUrl();
  const printedAt = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 10, 8, 15, 15);
  doc.text("CSI Thoothukudi-Nazareth Diocese", 28, 15);

  doc.setFontSize(11);
  const title = "Appointments Made Report";
  doc.text(title, 28, 21);

  let startY = 28;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const metaLines = [
    `Total appointments: ${onlyAppointments.length}`,
    searchQuery ? `Search: "${searchQuery}"` : "",
  ].filter(Boolean);

  metaLines.forEach((line) => {
    doc.text(line, 10, startY);
    startY += 4.5;
  });

  const baseColumns =
    schoolType === "high" ? getHighColumns() : schoolType === "elementary" ? getElementaryColumns() : getClergyColumns();
  const columns = [...baseColumns, ...getAppointmentColumns()].filter((col) => col.keepAlways || onlyAppointments.some((c) => hasMeaningfulValue(col.getValue?.(c))));
  const rows = onlyAppointments.map((c) => columns.map((col) => col.getValue?.(c) ?? ""));

  autoTable(doc, {
    head: [columns.map((col) => col.title)],
    body: rows,
    startY: startY + 2,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7.2, cellPadding: 1.5 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, halign: "center" },
    columnStyles: buildColumnStyles(doc, columns),
    margin: { left: 10, right: 10, bottom: 15 },
  });

  applyPdfFooterAndWatermark(doc, logoDataUrl, printedAt);

  doc.save(`appointments-${schoolType}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
