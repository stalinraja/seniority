type SchoolDataPayload = {
  highSchool: any[];
  elementarySchool: any[];
  clergyOrdination: any[];
  schoolVacancies?: any[];
};

const DEFAULT_HIGH_SCHOOL_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQizNtmY220qkpPceFvfQk_M241lqzKs3K3ffxYTng5cLslZK_Xm6LlkQelDWdXQH2Plo_AmYwmnBew/pub?gid=0&single=true&output=csv";
const DEFAULT_ELEMENTARY_SCHOOL_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQizNtmY220qkpPceFvfQk_M241lqzKs3K3ffxYTng5cLslZK_Xm6LlkQelDWdXQH2Plo_AmYwmnBew/pub?gid=882704265&single=true&output=csv";
const DEFAULT_CLERGY_ORDINATION_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQizNtmY220qkpPceFvfQk_M241lqzKs3K3ffxYTng5cLslZK_Xm6LlkQelDWdXQH2Plo_AmYwmnBew/pub?gid=271291357&single=true&output=csv";

function parseCSV(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (ch === '"') {
      if (inQuotes && normalized[i + 1] === '"') {
        currentValue += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      continue;
    }
    if (ch === "\n" && !inQuotes) {
      currentRow.push(currentValue.trim());
      currentValue = "";
      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }
    currentValue += ch;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
    if (currentRow.some((value) => value.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, ""));

  return rows.slice(1).map((rowValues) => {
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = rowValues[idx] ?? "";
    });
    return row;
  });
}

function appendNoCacheParam(url: string) {
  const u = new URL(url);
  u.searchParams.set("_ts", String(Date.now()));
  return u.toString();
}

function normalizePayload(parsed: any): SchoolDataPayload {
  if (Array.isArray(parsed)) {
    return { highSchool: parsed, elementarySchool: [], clergyOrdination: [] };
  }
  return {
    highSchool: Array.isArray(parsed?.highSchool) ? parsed.highSchool : [],
    elementarySchool: Array.isArray(parsed?.elementarySchool) ? parsed.elementarySchool : [],
    clergyOrdination: Array.isArray(parsed?.clergyOrdination) ? parsed.clergyOrdination : [],
    schoolVacancies: Array.isArray(parsed?.schoolVacancies) ? parsed.schoolVacancies : [],
  };
}

async function fetchRowsFromUrl(url: string, attempt = 1): Promise<any[] | SchoolDataPayload> {
  try {
    const response = await fetch(appendNoCacheParam(url), { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load data from ${url}`);

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const raw = await response.text();
    const isJson = contentType.includes("application/json") || url.toLowerCase().includes(".json");

    if (isJson) {
      return normalizePayload(JSON.parse(raw));
    }

    if (/<html/i.test(raw) || contentType.includes("text/html")) {
      throw new Error(`Expected CSV/JSON but received HTML from ${url}`);
    }

    return parseCSV(raw);
  } catch (error) {
    if (attempt < 3) {
      const backoffMs = attempt === 1 ? 500 : 1500;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return fetchRowsFromUrl(url, attempt + 1);
    }
    throw error;
  }
}

function getConfiguredUrls() {
  const highUrl =
    import.meta.env.VITE_HIGH_SCHOOL_DATA_URL ||
    import.meta.env.VITE_HIGH_SCHOOL_CSV_URL ||
    import.meta.env.VITE_GOOGLE_SHEET_DATA_URL ||
    import.meta.env.VITE_GOOGLE_SHEET_CSV_URL ||
    DEFAULT_HIGH_SCHOOL_CSV_URL;

  const elementaryUrl =
    import.meta.env.VITE_ELEMENTARY_SCHOOL_DATA_URL ||
    import.meta.env.VITE_ELEMENTARY_SCHOOL_CSV_URL ||
    DEFAULT_ELEMENTARY_SCHOOL_CSV_URL;

  const clergyUrl =
    import.meta.env.VITE_CLERGY_ORDINATION_DATA_URL ||
    import.meta.env.VITE_CLERGY_ORDINATION_CSV_URL ||
    DEFAULT_CLERGY_ORDINATION_CSV_URL;

  return { highUrl, elementaryUrl, clergyUrl };
}

export async function fetchGoogleSheetData(): Promise<SchoolDataPayload> {
  const { highUrl, elementaryUrl, clergyUrl } = getConfiguredUrls();

  const highResult = await fetchRowsFromUrl(highUrl);
  if (!Array.isArray(highResult)) {
    return {
      highSchool: highResult.highSchool || [],
      elementarySchool: highResult.elementarySchool || [],
      clergyOrdination: highResult.clergyOrdination || [],
      schoolVacancies: highResult.schoolVacancies || [],
    };
  }

  let elementaryRows: any[] = [];
  if (elementaryUrl) {
    const elementaryResult = await fetchRowsFromUrl(elementaryUrl);
    elementaryRows = Array.isArray(elementaryResult)
      ? elementaryResult
      : elementaryResult.elementarySchool || [];
  }

  let clergyRows: any[] = [];
  if (clergyUrl) {
    const clergyResult = await fetchRowsFromUrl(clergyUrl);
    clergyRows = Array.isArray(clergyResult)
      ? clergyResult
      : clergyResult.clergyOrdination || [];
  }

  return {
    highSchool: highResult,
    elementarySchool: elementaryRows,
    clergyOrdination: clergyRows,
    schoolVacancies: [],
  };
}
