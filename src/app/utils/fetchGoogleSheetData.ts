type SchoolDataPayload = {
  highSchool: any[];
  elementarySchool: any[];
  clergyOrdination: any[];
  schoolVacancies?: any[];
  changeLog?: any[];
};

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
  const u = new URL(url, window.location.origin);
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
    changeLog: Array.isArray(parsed?.changeLog) ? parsed.changeLog : [],
  };
}

async function fetchRowsFromUrl(url: string, attempt = 1): Promise<any[] | SchoolDataPayload> {
  try {
    const response = await fetch(appendNoCacheParam(url), { cache: "no-store", credentials: "include" });
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

export async function fetchGoogleSheetData(): Promise<SchoolDataPayload> {
  const response = await fetch("/api/seniority-data", { cache: "no-store", credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to load protected data");
  }

  const payload = await response.json();
  return {
    highSchool: Array.isArray(payload?.highSchool) ? payload.highSchool : [],
    elementarySchool: Array.isArray(payload?.elementarySchool) ? payload.elementarySchool : [],
    clergyOrdination: Array.isArray(payload?.clergyOrdination) ? payload.clergyOrdination : [],
    schoolVacancies: Array.isArray(payload?.schoolVacancies) ? payload.schoolVacancies : [],
    changeLog: Array.isArray(payload?.changeLog) ? payload.changeLog : [],
  };
}
