import { fetchRowsFromCsvUrl, getChangeLogDocumentKey, getChangeLogDocumentUrl, sendJson } from "./_shared.js";

function getDriveFileId(url) {
  const trimmed = String(url || "").trim();
  const fileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (fileMatch?.[1]) return fileMatch[1];
  const idMatch = trimmed.match(/[?&]id=([^&]+)/i);
  return idMatch?.[1] || "";
}

async function findDocumentUrl(key) {
  const rows = await fetchRowsFromCsvUrl(process.env.CHANGE_LOG_CSV_URL || "");
  for (let index = 0; index < rows.length; index += 1) {
    if (getChangeLogDocumentKey(rows[index], index) === key) {
      return getChangeLogDocumentUrl(rows[index]);
    }
  }
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  // public endpoint; no auth required

  const key = String(req.query.key || "");
  const mode = String(req.query.mode || "view") === "download" ? "download" : "view";
  if (!key) return sendJson(res, 400, { error: "Missing document key" });

  const sourceUrl = await findDocumentUrl(key);
  if (!sourceUrl) return sendJson(res, 404, { error: "Document not found" });

  const fileId = getDriveFileId(sourceUrl);
  const fetchUrl = fileId
    ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`
    : sourceUrl;

  try {
    const upstream = await fetch(fetchUrl, { redirect: "follow" });
    if (!upstream.ok) return sendJson(res, 502, { error: "Failed to load document" });

    const contentType = upstream.headers.get("content-type") || "application/pdf";
    const arrayBuffer = await upstream.arrayBuffer();
    res.statusCode = 200;
    res.setHeader("content-type", contentType);
    res.setHeader("cache-control", "private, no-store");
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("content-disposition", `${mode === "download" ? "attachment" : "inline"}; filename="changelog-document.pdf"`);
    res.end(Buffer.from(arrayBuffer));
  } catch {
    return sendJson(res, 502, { error: "Failed to proxy document" });
  }
}
