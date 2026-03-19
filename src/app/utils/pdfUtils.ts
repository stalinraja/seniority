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

// --- TYPES ---

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
  const dob = candidate.dateOfBirth instanceof Date 
    ? candidate.dateOfBirth.toISOString() 
    : String(candidate.dateOfBirth || "");
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

function getElementaryTetDisplay(candidate: any) {
  if (candidate.tetCompletion === null || candidate.tetCompletion === undefined) return "-";
  const isPassed = Number(candidate.tetCompletion) >= ELEMENTARY_TET_PASS_MARK;
  return `${candidate.tetCompletion}% (${isPassed ? "Yes" : "No"})`;
}

function hasMeaningfulValue(value: any) {
  if (typeof value === "number") return Number.isFinite(value);
  const normalized = String(value || "").trim();
  return !(!normalized || normalized === "-" || normalized.toLowerCase() === "unknown");
}

// --- COLUMN DEFINITIONS ---

function getHighColumns(): PdfColumn[] {
  return [
    { key: "rank", title: "Rank", align: "center", minWidth: 10, weight: 1, keepAlways: true, getValue: (c) => c.rank ?? "" },
    ...getMemberIdColumn(),
    { key: "name", title: "Name", minWidth: 32, weight: 2.4, keepAlways: true, wrap: true, getValue: (c) => c.name || "" },
    { key: "dateOfBirth", title: "DOB", align: "center", minWidth: 20, weight: 1.6, keepAlways: true, getValue: (c) => formatDateForPdf(c.dateOfBirth) },
    { key: "category", title: "Category", align: "center", minWidth: 18, weight: 1.2, keepAlways: true, getValue: (c) => c.category || "" },
    { key: "department", title: "Dept", minWidth: 22, weight: 1.6, getValue: (c) => c.department || "" },
    { key: "qualification", title: "Qualification", minWidth: 34, weight: 2.5, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
    { key: "yearOfPassing", title: "Passing", align: "center", minWidth: 18, weight: 1.2, getValue: (c) => c.yearOfPassing || "" },
    ...getAddressColumn(),
    ...getPincodeColumn(),
    { key: "pastorate", title: "Pastorate", minWidth: 22, weight: 1.6, wrap: true, getValue: (c) => c.pastorate || "-" },
  ];
}

function getElementaryColumns(): PdfColumn[] {
  return [
    { key: "rank", title: "Rank", align: "center", minWidth: 10, weight: 1, keepAlways: true, getValue: (c) => c.rank ?? "" },
    ...getMemberIdColumn(),
    { key: "name", title: "Name", minWidth: 30, weight: 2.3, keepAlways: true, wrap: true, getValue: (c) => c.name || "" },
    { key: "dateOfBirth", title: "DOB", align: "center", minWidth: 20, weight: 1.5, keepAlways: true, getValue: (c) => formatDateForPdf(c.dateOfBirth) },
    { key: "qualification", title: "Qualification", minWidth: 36, weight: 2.6, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
    { key: "tet", title: "TET %", align: "center", minWidth: 24, weight: 1.7, getValue: (c) => getElementaryTetDisplay(c) },
    { key: "category", title: "Category", align: "center", minWidth: 18, weight: 1.2, keepAlways: true, getValue: (c) => c.category || "" },
    { key: "pastorate", title: "Pastorate", minWidth: 22, weight: 1.6, wrap: true, getValue: (c) => c.pastorate || "" },
  ];
}

function getClergyColumns(): PdfColumn[] {
  return [
    { key: "rank", title: "Rank", align: "center", minWidth: 12, weight: 1, keepAlways: true, getValue: (c) => c.rank ?? "" },
    ...getMemberIdColumn(),
    { key: "name", title: "Name", minWidth: 38, weight: 2.4, keepAlways: true, wrap: true, getValue: (c) => c.name || "" },
    { key: "dateOfBirth", title: "DOB", align: "center", minWidth: 22, weight: 1.4, keepAlways: true, getValue: (c) => formatDateForPdf(c.dateOfBirth) },
    { key: "yearsOfExperience", title: "Exp (Yrs)", align: "center", minWidth: 24, weight: 1.3, keepAlways: true, getValue: (c) => c.yearsOfExperience ?? "" },
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

function buildColumnStyles(doc: jsPDF, columns: PdfColumn[]) {
  const contentWidth = doc.internal.pageSize.getWidth() - 20; // Margin adjustment
  const minSum = columns.reduce((sum, col) => sum + col.minWidth, 0);
  const weightSum = columns.reduce((sum, col) => sum + col.weight, 0);

  const columnStyles: Record<number, any> = {};
  columns.forEach((col, idx) => {
    // Dynamic width calculation based on weight relative to available space
    const calculatedWidth = col.minWidth + ((contentWidth - minSum) * (col.weight / weightSum));
    columnStyles[idx] = {
      cellWidth: Math.max(col.minWidth, calculatedWidth),
      halign: col.align || "left",
      cellPadding: 1.5,
    };
  });
  return columnStyles;
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

export async function downloadCandidatesPDF(
  candidates: any[],
  schoolType: SchoolType = "high",
  sortMode: "seniority" | "appointment" = "seniority"
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logoDataUrl = await loadLogoDataUrl();
  
  // Header section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  if (logoDataUrl) doc.addImage(logoDataUrl, "PNG", 10, 10, 15, 15);
  doc.text("CSI Thoothukudi-Nazareth Diocese", 30, 18);
  doc.setFontSize(11);
  doc.text(`${schoolType.toUpperCase()} SCHOOL - ${sortMode.toUpperCase()} LIST`, 30, 24);
  
  const allColumns = schoolType === "high" 
    ? getHighColumns() 
    : schoolType === "elementary" 
    ? getElementaryColumns() 
    : getClergyColumns();
    
  const columns = pickVisibleColumns(allColumns, candidates);
  const rows = candidates.map((candidate) => columns.map((col) => col.getValue?.(candidate) ?? ""));

  autoTable(doc, {
    head: [columns.map((col) => col.title)],
    body: rows,
    startY: 32,
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: buildColumnStyles(doc, columns),
    margin: { left: 10, right: 10 },
  });

  const fileName = `${schoolType}-${sortMode}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}