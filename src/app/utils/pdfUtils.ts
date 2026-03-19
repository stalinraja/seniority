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

type AppointmentSchoolType = "high" | "elementary" | "clergy";
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
  return String(value || "")
    .split("-")
    .map((q) => q.trim())
    .filter(Boolean)
    .join(" | ");
}

function getTetDisplay(candidate: any) {
  if (!String(candidate.category || "").toUpperCase().includes("UG")) return "-";
  if (Number.isFinite(candidate.tetScore)) {
    return `${candidate.tetScore}${Number.isFinite(candidate.tetYear) ? ` (${candidate.tetYear})` : ""}`;
  }
  if (candidate.tetRaw) return candidate.tetRaw;
  if (candidate.tetQualified === true) return "Yes";
  if (candidate.tetQualified === false) return "No";
  return "-";
}

function getElementaryTetDisplay(candidate: any) {
  if (candidate.tetCompletion === null || candidate.tetCompletion === undefined) return "-";
  return `${candidate.tetCompletion}%${Number(candidate.tetCompletion) >= ELEMENTARY_TET_PASS_MARK ? " (Yes)" : " (No)"}`;
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
    { key: "department", title: "Department", minWidth: 22, weight: 1.6, getValue: (c) => c.department || "" },
    { key: "qualification", title: "Qualification", minWidth: 34, weight: 2.5, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
    { key: "yearOfPassing", title: "Year of Passing", align: "center", minWidth: 18, weight: 1.2, getValue: (c) => c.yearOfPassing || "" },
    { key: "yearOfRegistering", title: "Year of Registering", align: "center", minWidth: 18, weight: 1.2, getValue: (c) => c.yearOfRegistering ?? "" },
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
    { key: "dateOfBirth", title: "Date of Birth", align: "center", minWidth: 20, weight: 1.5, keepAlways: true, getValue: (c) => formatDateForPdf(c.dateOfBirth) },
    { key: "yearOfPassing", title: "Year of Passing", align: "center", minWidth: 18, weight: 1.2, getValue: (c) => c.yearOfPassing ?? "" },
    { key: "yearOfRegistering", title: "Year of Registering", align: "center", minWidth: 18, weight: 1.2, getValue: (c) => c.yearOfRegistering ?? "" },
    { key: "qualification", title: "Qualification", minWidth: 36, weight: 2.6, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
    { key: "tet", title: "TET Qualification", align: "center", minWidth: 24, weight: 1.7, getValue: (c) => getElementaryTetDisplay(c) },
    { key: "category", title: "Category", align: "center", minWidth: 18, weight: 1.2, keepAlways: true, getValue: (c) => c.category || "" },
    { key: "level", title: "Level", align: "center", minWidth: 16, weight: 1.2, getValue: (c) => c.level || "" },
    { key: "pastorate", title: "Pastorate", minWidth: 22, weight: 1.6, wrap: true, getValue: (c) => c.pastorate || "" },
    { key: "council", title: "Council", minWidth: 20, weight: 1.5, wrap: true, getValue: (c) => c.council || "" },
  ];
}

function getClergyColumns(): PdfColumn[] {
  return [
    { key: "rank", title: "Rank", align: "center", minWidth: 12, weight: 1, keepAlways: true, getValue: (c) => c.rank ?? "" },
    ...getMemberIdColumn(),
    { key: "name", title: "Name", minWidth: 38, weight: 2.4, keepAlways: true, wrap: true, getValue: (c) => c.name || "" },
    { key: "dateOfBirth", title: "Date of Birth", align: "center", minWidth: 22, weight: 1.4, keepAlways: true, getValue: (c) => formatDateForPdf(c.dateOfBirth) },
    { key: "yearOfPassing", title: "Year of Passing", align: "center", minWidth: 22, weight: 1.2, keepAlways: true, getValue: (c) => c.yearOfPassing ?? "" },
    { key: "yearsOfExperience", title: "Years of Experience", align: "center", minWidth: 24, weight: 1.3, keepAlways: true, getValue: (c) => c.yearsOfExperience ?? "" },
    { key: "qualification", title: "Qualification", minWidth: 40, weight: 2.6, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
    { key: "homePastorate", title: "Home Pastorate", minWidth: 30, weight: 2, keepAlways: true, wrap: true, getValue: (c) => c.homePastorate || "" },
  ];
}

// --- PDF GENERATION LOGIC ---

function pickVisibleColumns(columns: PdfColumn[], candidates: any[]) {
  return columns.filter((column) => {
    if (column.keepAlways) return true;
    return candidates.some((candidate) => hasMeaningfulValue(column.getValue?.(candidate)));
  });
}

function getHeaderMinWidth(doc: jsPDF, title: string) {
  const prevSize = doc.getFontSize();
  doc.setFontSize(8);
  const width = doc.getTextWidth(title) + 6;
  doc.setFontSize(prevSize);
  return Math.ceil(width);
}

function buildColumnStyles(doc: jsPDF, columns: PdfColumn[]) {
  const contentWidth = doc.internal.pageSize.getWidth() - 12; // 6 left + 6 right margin
  const effectiveMinWidths = columns.map((col) => Math.max(col.minWidth, getHeaderMinWidth(doc, col.title)));
  const minSum = effectiveMinWidths.reduce((sum, w) => sum + w, 0);
  const widths: number[] = [];

  if (minSum > contentWidth) {
    const scale = contentWidth / minSum;
    effectiveMinWidths.forEach((w) => widths.push(Number((w * scale).toFixed(2))));
  } else {
    const extra = contentWidth - minSum;
    const weightSum = columns.reduce((sum, col) => sum + col.weight, 0) || 1;
    columns.forEach((col, idx) => {
      const width = effectiveMinWidths[idx] + (extra * col.weight) / weightSum;
      widths.push(Number(width.toFixed(2)));
    });
  }

  return Object.fromEntries(
    columns.map((col, idx) => [
      idx,
      { cellWidth: widths[idx], halign: col.align || "left", overflow: col.wrap ? "linebreak" : "hidden" },
    ])
  );
}

function slugifyPart(value: string) {
  return String(value || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const baseUrl = (import.meta as any).env?.BASE_URL || "/";
    const res = await fetch(`${baseUrl}diocese-logo.png`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function buildPdfFileName(schoolType: SchoolType, filters: Record<string, string[]>, sortMode: string, searchQuery: string) {
  const base = schoolType === "high" ? "high-school" : schoolType === "elementary" ? "elementary" : "clergy";
  const datePart = new Date().toISOString().slice(0, 10);
  return `${base}-${sortMode}-${datePart}.pdf`;
}

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
  
  const title = schoolType === "high" ? "High School Priority List" : schoolType === "elementary" ? "Elementary School Priority List" : "Clergy Priority List";

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 8, 6, 16, 16);
  doc.text("CSI Thoothukudi-Nazareth Diocese", 28, 13);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(title, 28, 20);

  let startY = 28;
  const metaText = `Sorted by: ${sortMode === "appointment" ? "Appointing Order" : "Seniority"} ${searchQuery ? `| Search: ${searchQuery}` : ""}`;
  
  doc.setFontSize(9);
  doc.text(metaText, 8, startY);
  startY += 6;

  const allColumns = schoolType === "high" ? getHighColumns() : schoolType === "elementary" ? getElementaryColumns() : getClergyColumns();
  
  let columns = pickVisibleColumns(allColumns, candidates);
  let rowsSource = candidates;

  // Dual Rank logic for Search
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
      { key: "sRank", title: "Seniority Rank", align: "center", minWidth: 16, weight: 1, getValue: (c) => c._sRank },
      { key: "aRank", title: "Appt Rank", align: "center", minWidth: 16, weight: 1, getValue: (c) => c._aRank },
      ...columns.filter(col => col.key !== "rank")
    ];
  }

  const rows = rowsSource.map((c) => columns.map((col) => col.getValue?.(c) ?? ""));

  autoTable(doc, {
    head: [columns.map((col) => col.title)],
    body: rows,
    startY,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7.2, cellPadding: 1.8 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    columnStyles: buildColumnStyles(doc, columns),
    didDrawPage: (data) => {
      if (logoDataUrl) {
        doc.saveGraphicsState();
        doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
        doc.addImage(logoDataUrl, "PNG", 100, 60, 60, 60);
        doc.restoreGraphicsState();
      }
      doc.setFontSize(8);
      doc.text(`Page ${data.pageNumber}`, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10);
    }
  });

  doc.save(buildPdfFileName(schoolType, filters, sortMode, searchQuery));
}