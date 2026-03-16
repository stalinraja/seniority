import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ELEMENTARY_TET_PASS_MARK } from "../config/features";

type SchoolType = "high" | "elementary" | "clergy";

type PdfColumn = {
  key: string;
  title: string;
  align?: "left" | "center" | "right";
  minWidth: number;
  weight: number;
  keepAlways?: boolean;
  wrap?: boolean;
  getValue: (candidate: any) => string | number;
};

type AppointmentSchoolType = SchoolType;

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
  if (!normalized) return false;
  if (normalized === "-") return false;
  if (normalized.toLowerCase() === "unknown") return false;
  return true;
}

function getHighColumns(): PdfColumn[] {
  return [
    { key: "rank", title: "Rank", align: "center", minWidth: 10, weight: 1, keepAlways: true, getValue: (c) => c.rank ?? "" },
    { key: "memberId", title: "Member ID", minWidth: 16, weight: 1.4, keepAlways: true, getValue: (c) => c.memberId || "" },
    { key: "name", title: "Name", minWidth: 32, weight: 2.4, keepAlways: true, wrap: true, getValue: (c) => c.name || "" },
    { key: "dateOfBirth", title: "Date of Birth", align: "center", minWidth: 20, weight: 1.6, keepAlways: true, getValue: (c) => formatDateForPdf(c.dateOfBirth) },
    { key: "category", title: "Category", align: "center", minWidth: 18, weight: 1.2, keepAlways: true, getValue: (c) => c.category || "" },
    { key: "department", title: "Department", minWidth: 22, weight: 1.6, getValue: (c) => c.department || "" },
    { key: "qualification", title: "Qualification", minWidth: 34, weight: 2.5, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
    { key: "yearOfPassing", title: "Year of Passing", align: "center", minWidth: 18, weight: 1.2, getValue: (c) => c.yearOfPassing || "" },
    { key: "yearOfRegistering", title: "Year of Registering", align: "center", minWidth: 18, weight: 1.2, getValue: (c) => c.yearOfRegistering ?? "" },
    { key: "tet", title: "TET Qualified", align: "center", minWidth: 20, weight: 1.5, getValue: (c) => getTetDisplay(c) },
    { key: "address", title: "Address", minWidth: 40, weight: 3, wrap: true, getValue: (c) => c.address || "-" },
    { key: "pincode", title: "Pincode", align: "center", minWidth: 14, weight: 1, getValue: (c) => c.pincode || "-" },
    { key: "pastorate", title: "Pastorate", minWidth: 22, weight: 1.6, wrap: true, getValue: (c) => c.pastorate || "-" },
    { key: "council", title: "Council", minWidth: 20, weight: 1.5, wrap: true, getValue: (c) => c.council || "-" },
  ];
}

function getElementaryColumns(): PdfColumn[] {
  return [
    { key: "rank", title: "Rank", align: "center", minWidth: 10, weight: 1, keepAlways: true, getValue: (c) => c.rank ?? "" },
    { key: "memberId", title: "Member ID", minWidth: 16, weight: 1.4, keepAlways: true, getValue: (c) => c.memberId || "" },
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
    { key: "memberId", title: "Member ID", minWidth: 18, weight: 1.4, keepAlways: true, getValue: (c) => c.memberId || "" },
    { key: "name", title: "Name", minWidth: 38, weight: 2.4, keepAlways: true, wrap: true, getValue: (c) => c.name || "" },
    { key: "dateOfBirth", title: "Date of Birth", align: "center", minWidth: 22, weight: 1.4, keepAlways: true, getValue: (c) => formatDateForPdf(c.dateOfBirth) },
    { key: "yearOfPassing", title: "Year of Passing", align: "center", minWidth: 22, weight: 1.2, keepAlways: true, getValue: (c) => c.yearOfPassing ?? "" },
    { key: "yearsOfExperience", title: "Years of Experience", align: "center", minWidth: 24, weight: 1.3, keepAlways: true, getValue: (c) => c.yearsOfExperience ?? "" },
    { key: "qualification", title: "Qualification", minWidth: 40, weight: 2.6, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
    { key: "homePastorate", title: "Home Pastorate", minWidth: 30, weight: 2, keepAlways: true, wrap: true, getValue: (c) => c.homePastorate || "" },
  ];
}

function getAppointmentColumns(schoolType: AppointmentSchoolType): PdfColumn[] {
  const commonStart: PdfColumn[] = [
    { key: "rank", title: "Rank", align: "center", minWidth: 10, weight: 1, keepAlways: true, getValue: (c) => c.rank ?? "" },
    { key: "memberId", title: "Member ID", minWidth: 16, weight: 1.4, keepAlways: true, getValue: (c) => c.memberId || "" },
    { key: "name", title: "Name", minWidth: 30, weight: 2.2, keepAlways: true, wrap: true, getValue: (c) => c.name || "" },
    { key: "dateOfBirth", title: "Date of Birth", align: "center", minWidth: 20, weight: 1.3, keepAlways: true, getValue: (c) => formatDateForPdf(c.dateOfBirth) },
  ];
  const commonEnd: PdfColumn[] = [
    { key: "appointed", title: "Appointed", align: "center", minWidth: 16, weight: 1.1, keepAlways: true, getValue: (c) => (c.appointed ? "Yes" : "No") },
    { key: "appointedDate", title: "Appointed Date", align: "center", minWidth: 20, weight: 1.3, getValue: (c) => c.appointedDate || "-" },
    { key: "compassionReason", title: "Compassion Based Reason", minWidth: 34, weight: 2.6, wrap: true, getValue: (c) => c.compassionReason || "-" },
    { key: "appointedLocation", title: "Appointed Location", minWidth: 32, weight: 2.4, keepAlways: true, wrap: true, getValue: (c) => c.appointedLocation || "-" },
  ];

  if (schoolType === "high") {
    return [
      ...commonStart,
      { key: "yearOfPassing", title: "Year of Passing", align: "center", minWidth: 16, weight: 1.1, getValue: (c) => c.yearOfPassing || "" },
      { key: "yearOfRegistering", title: "Year of Registering", align: "center", minWidth: 16, weight: 1.1, getValue: (c) => c.yearOfRegistering || "" },
      { key: "department", title: "Department", minWidth: 20, weight: 1.5, getValue: (c) => c.department || "" },
      { key: "category", title: "Category", align: "center", minWidth: 16, weight: 1.1, getValue: (c) => c.category || "" },
      { key: "tet", title: "TET Qualified", align: "center", minWidth: 18, weight: 1.2, getValue: (c) => getTetDisplay(c) },
      { key: "qualification", title: "Qualification", minWidth: 30, weight: 2.2, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
      { key: "address", title: "Address", minWidth: 32, weight: 2.4, wrap: true, getValue: (c) => c.address || "-" },
      { key: "pincode", title: "Pincode", align: "center", minWidth: 13, weight: 1, getValue: (c) => c.pincode || "-" },
      { key: "pastorate", title: "Pastorate", minWidth: 20, weight: 1.5, wrap: true, getValue: (c) => c.pastorate || "" },
      { key: "council", title: "Council", minWidth: 18, weight: 1.4, wrap: true, getValue: (c) => c.council || "" },
      ...commonEnd,
    ];
  }

  if (schoolType === "elementary") {
    return [
      ...commonStart,
      { key: "yearOfPassing", title: "Year of Passing", align: "center", minWidth: 16, weight: 1.1, getValue: (c) => c.yearOfPassing || "" },
      { key: "yearOfRegistering", title: "Year of Registering", align: "center", minWidth: 16, weight: 1.1, getValue: (c) => c.yearOfRegistering || "" },
      { key: "qualification", title: "Qualification", minWidth: 30, weight: 2.2, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
      { key: "tet", title: "TET Qualification", align: "center", minWidth: 20, weight: 1.3, getValue: (c) => getElementaryTetDisplay(c) },
      { key: "category", title: "Category", align: "center", minWidth: 16, weight: 1.1, getValue: (c) => c.category || "" },
      { key: "level", title: "Level", align: "center", minWidth: 14, weight: 1, getValue: (c) => c.level || "" },
      { key: "pastorate", title: "Pastorate", minWidth: 20, weight: 1.5, wrap: true, getValue: (c) => c.pastorate || "" },
      { key: "council", title: "Council", minWidth: 18, weight: 1.4, wrap: true, getValue: (c) => c.council || "" },
      ...commonEnd,
    ];
  }

  return [
    ...commonStart,
    { key: "yearOfPassing", title: "Year of Passing", align: "center", minWidth: 18, weight: 1.2, keepAlways: true, getValue: (c) => c.yearOfPassing || "" },
    { key: "yearsOfExperience", title: "Years of Experience", align: "center", minWidth: 20, weight: 1.3, keepAlways: true, getValue: (c) => c.yearsOfExperience || "" },
    { key: "qualification", title: "Qualification", minWidth: 34, weight: 2.5, wrap: true, getValue: (c) => splitQualifications(c.qualification) },
    { key: "homePastorate", title: "Home Pastorate", minWidth: 24, weight: 1.8, wrap: true, getValue: (c) => c.homePastorate || "" },
    ...commonEnd,
  ];
}

function pickVisibleColumns(columns: PdfColumn[], candidates: any[]) {
  return columns.filter((column) => {
    if (column.keepAlways) return true;
    return candidates.some((candidate) => hasMeaningfulValue(column.getValue(candidate)));
  });
}

function buildColumnStyles(doc: jsPDF, columns: PdfColumn[]) {
  const marginLeft = 6;
  const marginRight = 6;
  const contentWidth = doc.internal.pageSize.getWidth() - marginLeft - marginRight;
  const minSum = columns.reduce((sum, col) => sum + col.minWidth, 0);
  const widths: number[] = [];

  if (minSum > contentWidth) {
    const scale = contentWidth / minSum;
    columns.forEach((col) => widths.push(Number((col.minWidth * scale).toFixed(2))));
  } else {
    const extra = contentWidth - minSum;
    const weightSum = columns.reduce((sum, col) => sum + col.weight, 0) || 1;
    columns.forEach((col) => {
      const width = col.minWidth + (extra * col.weight) / weightSum;
      widths.push(Number(width.toFixed(2)));
    });
  }

  return Object.fromEntries(
    columns.map((col, idx) => [
      idx,
      {
        cellWidth: widths[idx],
        halign: col.align || "left",
        overflow: col.wrap ? "linebreak" : "hidden",
      },
    ])
  );
}

function slugifyPart(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const url = `${import.meta.env.BASE_URL || "/"}diocese-logo.png`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function buildPdfFileName(schoolType: SchoolType, filters: Record<string, string[]>, sortMode: "seniority" | "appointment" = "seniority", searchQuery = "") {
  const base =
    schoolType === "high"
      ? "high-school-seniority"
      : schoolType === "elementary"
      ? "elementary-school-seniority"
      : "clergy-ordination-seniority";
  const filterParts = Object.entries(filters || {})
    .filter(([, values]) => Array.isArray(values) && values.length > 0)
    .flatMap(([key, values]) => {
      const safeKey = slugifyPart(key);
      const safeValues = values
        .map((v) => slugifyPart(v))
        .filter(Boolean)
        .slice(0, 3)
        .join("-");
      if (!safeKey || !safeValues) return [];
      return `${safeKey}-${safeValues}`;
    })
    .filter(Boolean);

  const datePart = new Date().toISOString().slice(0, 10);
  const filterSuffix = filterParts.length ? `-${filterParts.join("-")}` : "-all";
  const searchPart = slugifyPart(searchQuery).slice(0, 40);
  const searchSuffix = searchPart ? `-search-${searchPart}` : "";
  return `${base}-${sortMode}${filterSuffix}${searchSuffix}-${datePart}.pdf`;
}

export async function downloadCandidatesPDF(
  candidates: any[],
  filters: Record<string, string[]>,
  schoolType: SchoolType = "high",
  sortMode: "seniority" | "appointment" = "seniority",
  searchQuery = ""
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logoDataUrl = await loadLogoDataUrl();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  const title =
    schoolType === "high"
      ? `High/Higher Secondary School ${sortMode === "appointment" ? "Appointment" : "Seniority"} List`
      : schoolType === "elementary"
      ? `Elementry/Middle School ${sortMode === "appointment" ? "Appointment" : "Seniority"} List`
      : "Clergy Ordination Seniority List";

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", 8, 6, 16, 16);
  }
  doc.text("CSI Thoothukudi Nazareth Diocese", 28, 13);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(title, 28, 20);

  const printedAt = new Date();
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Printed: ${printedAt.toLocaleString()}`, 250, 12, { align: "right" });

  let startY = 26;
  if (filters) {
    const filterText = Object.entries(filters)
      .filter(([, v]) => v && v.length)
      .map(([k, v]) => `${k}: ${v.join(", ")}`)
      .join(" | ");
    if (filterText) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const wrapped = doc.splitTextToSize(`Filters: ${filterText}`, 285);
      doc.text(wrapped, 8, startY);
      startY += wrapped.length * 4 + 2;
    }
  }

  const allColumns =
    schoolType === "high"
      ? getHighColumns()
      : schoolType === "elementary"
      ? getElementaryColumns()
      : getClergyColumns();
  const columns = pickVisibleColumns(allColumns, candidates);
  const headers = [columns.map((col) => col.title)];
  const rows = candidates.map((candidate) => columns.map((col) => col.getValue(candidate)));
  const columnStyles = buildColumnStyles(doc, columns);


  autoTable(doc, {
    head: headers,
    body: rows,
    startY,
    didDrawPage: (data) => {
      const totalPages = doc.getNumberOfPages();
      const pageNumber = data.pageNumber;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      if (logoDataUrl) {
        const GState = (doc as any).GState;
        if (GState && (doc as any).setGState) {
          (doc as any).setGState(new GState({ opacity: 0.06 }));
        }
        doc.addImage(logoDataUrl, "PNG", pageWidth / 2 - 30, pageHeight / 2 - 30, 60, 60);
        if (GState && (doc as any).setGState) {
          (doc as any).setGState(new GState({ opacity: 1 }));
        }
      }

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Printed: ${printedAt.toLocaleString()}`, 8, pageHeight - 6);
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 8, pageHeight - 6, { align: "right" });
    },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: 1.8,
      valign: "middle",
      lineColor: [30, 41, 59],
      lineWidth: 0.35,
      textColor: [15, 23, 42],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      halign: "center",
      fontStyle: "bold",
      fontSize: 7.6,
      cellPadding: 2,
      lineColor: [15, 23, 42],
      lineWidth: 0.45,
      overflow: "hidden",
    },
    bodyStyles: {
      fontStyle: "normal",
    },
    margin: { left: 6, right: 6, top: 6, bottom: 8 },
    tableWidth: "auto",
    columnStyles,
  });

  doc.save(buildPdfFileName(schoolType, filters, sortMode, searchQuery));
}

function buildAppointmentReportFileName(schoolType: AppointmentSchoolType) {
  const base =
    schoolType === "high"
      ? "high-school-appointments-report"
      : schoolType === "elementary"
      ? "elementary-school-appointments-report"
      : "clergy-appointments-report";
  const datePart = new Date().toISOString().slice(0, 10);
  return `${base}-${datePart}.pdf`;
}

export async function downloadAppointmentsReportPDF(
  appointmentRows: any[],
  schoolType: AppointmentSchoolType
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const logoDataUrl = await loadLogoDataUrl();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(
    schoolType === "high"
      ? "High/Higher Secondary Appointment Report"
      : schoolType === "elementary"
      ? "Elementary/Middle School Appointment Report"
      : "Clergy Appointment Report",
    8,
    14
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Total Appointments: ${appointmentRows.length}`, 8, 19);

  const columns = getAppointmentColumns(schoolType);
  const headers = [columns.map((col) => col.title)];
  const rows = appointmentRows.map((candidate) => columns.map((col) => col.getValue(candidate)));
  const columnStyles = buildColumnStyles(doc, columns);


  const filterText = Object.entries(filters || {})
    .filter(([, v]) => v && v.length)
    .map(([k, v]) => `${k}: ${v.join(", ")}`)
    .join(" | ");
  const searchText = searchQuery ? `Search: ${searchQuery}` : "";
  const sortText = `Sorted by: ${sortMode === "appointment" ? "Appointment" : "Seniority"}`;
  const metaText = [sortText, filterText, searchText].filter(Boolean).join(" | ");

  if (metaText) {
    const wrapped = doc.splitTextToSize(metaText, 285);
    doc.text(wrapped, 8, startY);
    startY += wrapped.length * 4 + 2;
  }

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 23,
    didDrawPage: (data) => {
      const totalPages = doc.getNumberOfPages();
      const pageNumber = data.pageNumber;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      if (logoDataUrl) {
        const GState = (doc as any).GState;
        if (GState && (doc as any).setGState) {
          (doc as any).setGState(new GState({ opacity: 0.06 }));
        }
        doc.addImage(logoDataUrl, "PNG", pageWidth / 2 - 30, pageHeight / 2 - 30, 60, 60);
        if (GState && (doc as any).setGState) {
          (doc as any).setGState(new GState({ opacity: 1 }));
        }
      }

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Printed: ${printedAt.toLocaleString()}`, 8, pageHeight - 6);
      doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 8, pageHeight - 6, { align: "right" });
    },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 1.6,
      valign: "middle",
      lineColor: [30, 41, 59],
      lineWidth: 0.35,
      textColor: [15, 23, 42],
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      halign: "center",
      fontStyle: "bold",
      fontSize: 7.3,
      cellPadding: 1.9,
      lineColor: [15, 23, 42],
      lineWidth: 0.45,
      overflow: "hidden",
    },
    margin: { left: 6, right: 6, top: 6, bottom: 8 },
    tableWidth: "auto",
    columnStyles,
  });

  doc.save(buildAppointmentReportFileName(schoolType));
}
