import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const COOKIE_NAME = "seniority_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export function parseCSV(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let currentRow = [];
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
      if (currentRow.some((value) => value.length > 0)) rows.push(currentRow);
      currentRow = [];
      continue;
    }
    currentValue += ch;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue.trim());
    if (currentRow.some((value) => value.length > 0)) rows.push(currentRow);
  }

  if (!rows.length) return [];
  const headers = rows[0].map((header) => String(header || "").replace(/^\uFEFF/, ""));
  return rows.slice(1).map((rowValues) => {
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = rowValues[idx] ?? "";
    });
    return row;
  });
}

export function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeKey(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getLooseValue(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row || {}, key)) return row[key];
  }
  const wanted = new Set(keys.map(normalizeKey));
  for (const [key, value] of Object.entries(row || {})) {
    if (wanted.has(normalizeKey(key))) return value;
  }
  return "";
}

export function getChangeLogDocumentUrl(row) {
  return normalizeText(getLooseValue(row, ["Documents", "Document", "Document Link", "Drive Link", "PDF"]));
}

function getDocumentKeySecret() {
  return process.env.PORTAL_DOCUMENT_KEY_SECRET || getSessionSecret();
}

export function getChangeLogDocumentKey(row, index) {
  const base = [
    getLooseValue(row, ["Sheet name", "Sheet Name", "List name", "List Name", "Sheet", "List", "School Type", "Category"]),
    getLooseValue(row, ["Date", "Change Date", "Changed Date"]),
    getLooseValue(row, ["Member ID", "Member Id", "MemberID", "memberId"]),
    getLooseValue(row, ["Name", "Member Name", "Candidate Name"]),
    getLooseValue(row, ["Action", "Change Action"]),
    String(index),
  ].map(normalizeText).join("|");
  return createHmac("sha256", getDocumentKeySecret()).update(base).digest("hex").slice(0, 32);
}

export function sanitizeChangeLogRows(rows) {
  return rows.map((row, index) => {
    const documentUrl = getChangeLogDocumentUrl(row);
    const documentKey = documentUrl ? getChangeLogDocumentKey(row, index) : "";
    const next = { ...row };
    let wroteDocumentKey = false;
    for (const key of Object.keys(next)) {
      if (["documents", "document", "documentlink", "drivelink", "pdf"].includes(normalizeKey(key))) {
        next[key] = documentKey;
        wroteDocumentKey = true;
      }
    }
    if (!wroteDocumentKey) next.Documents = documentKey;
    return next;
  });
}

export function appendNoCacheParam(url) {
  const parsed = new URL(url);
  parsed.searchParams.set("_ts", String(Date.now()));
  return parsed.toString();
}

export async function fetchRowsFromCsvUrl(url) {
  if (!url) return [];
  const response = await fetch(appendNoCacheParam(url), { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load CSV: ${response.status}`);
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  const raw = await response.text();
  if (/<html/i.test(raw) || contentType.includes("text/html")) {
    throw new Error("Expected CSV but received HTML");
  }
  return parseCSV(raw);
}

export function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

export function isAuthConfigured() {
  return Boolean(process.env.PORTAL_ACCESS_PASSWORD);
}

function getSessionSecret() {
  return process.env.PORTAL_SESSION_SECRET || process.env.PORTAL_ACCESS_PASSWORD || "development-session-secret";
}

function sign(value) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createSessionCookie() {
  const payload = Buffer.from(JSON.stringify({ nonce: randomBytes(12).toString("base64url"), exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 })).toString("base64url");
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function hasValidSession(req) {
  if (!isAuthConfigured()) return true;
  const cookie = String(req.headers.cookie || "");
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return false;
  const [payload, signature] = String(match[1]).split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
}

export function requireAuth(req, res) {
  if (hasValidSession(req)) return true;
  sendJson(res, 401, { error: "Unauthorized" });
  return false;
}

export function validatePassword(password) {
  const wanted = process.env.PORTAL_ACCESS_PASSWORD || "";
  if (!wanted) return true;
  return safeEqual(String(password || ""), wanted);
}
