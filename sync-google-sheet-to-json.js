// sync-google-sheet-to-json.js
// Pulls Google Sheet CSV and writes JSON cache for fast UI loads.
// One-shot: node sync-google-sheet-to-json.js
// Watch mode (every 1 minute): node sync-google-sheet-to-json.js --watch

import "dotenv/config";
import { get } from "https";
import { readFileSync, writeFileSync } from "fs";
import { createHash } from "crypto";

const DEFAULT_GOOGLE_SHEET_PUB_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQizNtmY220qkpPceFvfQk_M241lqzKs3K3ffxYTng5cLslZK_Xm6LlkQelDWdXQH2Plo_AmYwmnBew/pub?output=csv";
const GOOGLE_SHEET_PUB_URL =
  process.env.GOOGLE_SHEET_PUB_URL ||
  process.env.GOOGLE_SHEET_CSV_URL ||
  DEFAULT_GOOGLE_SHEET_PUB_URL;
const HIGH_SCHOOL_GID = process.env.HIGH_SCHOOL_GID || "";
const ELEMENTARY_SCHOOL_GID = process.env.ELEMENTARY_SCHOOL_GID || "";

function buildCsvUrlFromPublishedUrl(baseUrl, gid = "") {
  const parsed = new URL(baseUrl);
  parsed.searchParams.set("output", "csv");
  if (gid) {
    parsed.searchParams.set("gid", gid);
    parsed.searchParams.set("single", "true");
  }
  return parsed.toString();
}

const HIGH_SCHOOL_CSV_URL =
  process.env.HIGH_SCHOOL_CSV_URL ||
  buildCsvUrlFromPublishedUrl(GOOGLE_SHEET_PUB_URL, HIGH_SCHOOL_GID);
const ELEMENTARY_SCHOOL_CSV_URL =
  process.env.ELEMENTARY_SCHOOL_CSV_URL ||
  (ELEMENTARY_SCHOOL_GID
    ? buildCsvUrlFromPublishedUrl(GOOGLE_SHEET_PUB_URL, ELEMENTARY_SCHOOL_GID)
    : "");
const SCHOOL_VACANCY_CSV_URL = process.env.SCHOOL_VACANCY_CSV_URL || "";
const OUTPUT_PATH = "./public/seniority-data.json";
const ONE_MINUTE_MS = 60 * 1000;
const WATCH_MODE = process.argv.includes("--watch");
let lastSyncedHash = "";
const RETRYABLE_ERROR_CODES = new Set(["EAI_AGAIN", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET"]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  values.push(current.trim());
  return values;
}

function parseCSV(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0].replace(/^\uFEFF/, ""));

  return lines.slice(1).map((line) => {
    const rowValues = parseCSVLine(line);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = rowValues[idx] ?? "";
    });
    return row;
  });
}

function buildDataPayload(highSchoolRows, elementarySchoolRows, schoolVacancies) {
  return {
    highSchool: highSchoolRows,
    elementarySchool: elementarySchoolRows,
    schoolVacancies,
  };
}

function buildDataHashFromPayload(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function buildDataHashFromFileContent(raw) {
  try {
    const parsed = JSON.parse(raw);
    return buildDataHashFromPayload(
      buildDataPayload(
        parsed.highSchool || [],
        parsed.elementarySchool || [],
        parsed.schoolVacancies || []
      )
    );
  } catch {
    return createHash("sha256").update(raw).digest("hex");
  }
}

function fetchCSV(url, redirectsLeft = 5) {
  const fetchUrl = new URL(url);
  fetchUrl.searchParams.set("_ts", String(Date.now()));

  return new Promise((resolve, reject) => {
    get(fetchUrl, (res) => {
      const status = res.statusCode ?? 0;

      if (
        [301, 302, 303, 307, 308].includes(status) &&
        res.headers.location &&
        redirectsLeft > 0
      ) {
        const nextUrl = new URL(res.headers.location, fetchUrl).toString();
        res.resume();
        resolve(fetchCSV(nextUrl, redirectsLeft - 1));
        return;
      }

      if (status !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () =>
        resolve({
          body,
          finalUrl: fetchUrl.toString(),
          contentType: res.headers["content-type"] || "",
        })
      );
    }).on("error", reject);
  });
}

async function syncOnce() {
  try {
    const highResult = await fetchCSV(HIGH_SCHOOL_CSV_URL);
    const highCsvText = highResult.body;
    const highContentType = String(highResult.contentType || "");

    if (/<html/i.test(highCsvText) || /text\/html/i.test(highContentType)) {
      throw new Error(
        `Expected CSV but received HTML for high school from ${highResult.finalUrl}.`
      );
    }

    const highSchoolRows = parseCSV(highCsvText);
    if (highSchoolRows.length === 0) {
      throw new Error(
        `High school sheet returned 0 rows from ${highResult.finalUrl}.`
      );
    }

    let elementarySchoolRows = [];
    let elementarySource = "";
    if (ELEMENTARY_SCHOOL_CSV_URL) {
      const elementaryResult = await fetchCSV(ELEMENTARY_SCHOOL_CSV_URL);
      const elementaryCsvText = elementaryResult.body;
      const elementaryContentType = String(elementaryResult.contentType || "");

      if (
        /<html/i.test(elementaryCsvText) ||
        /text\/html/i.test(elementaryContentType)
      ) {
        throw new Error(
          `Expected CSV but received HTML for elementary school from ${elementaryResult.finalUrl}.`
        );
      }

      elementarySchoolRows = parseCSV(elementaryCsvText);
      elementarySource = elementaryResult.finalUrl;
      if (elementarySchoolRows.length === 0) {
        throw new Error(
          `Elementary school sheet returned 0 rows from ${elementaryResult.finalUrl}. Publish the Elementary tab separately as CSV or verify its gid/link.`
        );
      }
    }

    let schoolVacancies = [];
    if (SCHOOL_VACANCY_CSV_URL) {
      const vacancyResult = await fetchCSV(SCHOOL_VACANCY_CSV_URL);
      const vacancyCsvText = vacancyResult.body;
      const vacancyContentType = String(vacancyResult.contentType || "");
      if (/<html/i.test(vacancyCsvText) || /text\/html/i.test(vacancyContentType)) {
        throw new Error(
          `Expected CSV but received HTML for school vacancies from ${vacancyResult.finalUrl}.`
        );
      }
      schoolVacancies = parseCSV(vacancyCsvText);
    }

    const dataPayload = buildDataPayload(highSchoolRows, elementarySchoolRows, schoolVacancies);
    const payload = {
      ...dataPayload,
      syncedAt: new Date().toISOString(),
      sources: {
        highSchool: HIGH_SCHOOL_CSV_URL,
        elementarySchool: ELEMENTARY_SCHOOL_CSV_URL || elementarySource,
        schoolVacancies: SCHOOL_VACANCY_CSV_URL,
      },
    };

    const nextJson = JSON.stringify(payload);
    const nextHash = buildDataHashFromPayload(dataPayload);

    if (!lastSyncedHash) {
      try {
        const existing = readFileSync(OUTPUT_PATH, "utf8");
        lastSyncedHash = buildDataHashFromFileContent(existing);
      } catch {
        // No existing file yet; proceed to write.
      }
    }

    if (nextHash === lastSyncedHash) {
      console.log(
        `[${new Date().toISOString()}] No sheet changes detected. Skipping write.`
      );
      return;
    }

    writeFileSync(OUTPUT_PATH, nextJson);
    lastSyncedHash = nextHash;
    console.log(
      `[${new Date().toISOString()}] Synced High=${highSchoolRows.length}, Elementary=${elementarySchoolRows.length} rows to ${OUTPUT_PATH}`
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Sync failed:`, error);
    if (!WATCH_MODE) {
      process.exitCode = 1;
    }
    throw error;
  }
}

async function syncWithRetry() {
  const maxAttempts = WATCH_MODE ? 3 : 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await syncOnce();
      return;
    } catch (error) {
      const code = error?.code || "";
      const shouldRetry = RETRYABLE_ERROR_CODES.has(code) && attempt < maxAttempts;
      if (!shouldRetry) throw error;
      const waitMs = attempt * 3000;
      console.warn(
        `[${new Date().toISOString()}] Temporary network error (${code}). Retrying in ${waitMs / 1000}s...`
      );
      await sleep(waitMs);
    }
  }
}

await syncWithRetry();

if (WATCH_MODE) {
  console.log(
    `[${new Date().toISOString()}] Watch mode enabled. Re-sync every 1 minute.`
  );
  setInterval(syncWithRetry, ONE_MINUTE_MS);
}
