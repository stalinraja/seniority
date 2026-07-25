import { fetchRowsFromCsvUrl, sanitizeChangeLogRows, sendJson } from "./_shared.js";

function getUrls() {
  return {
    highSchool: process.env.HIGH_SCHOOL_CSV_URL || process.env.GOOGLE_SHEET_CSV_URL || "",
    elementarySchool: process.env.ELEMENTARY_SCHOOL_CSV_URL || "",
    clergyOrdination: process.env.CLERGY_ORDINATION_CSV_URL || "",
    schoolVacancies: process.env.SCHOOL_VACANCY_CSV_URL || "",
    changeLog: process.env.CHANGE_LOG_CSV_URL || "",
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }
  const urls = getUrls();
  if (!urls.highSchool) {
    return sendJson(res, 500, { error: "Missing HIGH_SCHOOL_CSV_URL server environment variable" });
  }

  try {
    const [highSchool, elementarySchool, clergyOrdination, schoolVacancies, rawChangeLog] = await Promise.all([
      fetchRowsFromCsvUrl(urls.highSchool),
      fetchRowsFromCsvUrl(urls.elementarySchool),
      fetchRowsFromCsvUrl(urls.clergyOrdination),
      fetchRowsFromCsvUrl(urls.schoolVacancies),
      fetchRowsFromCsvUrl(urls.changeLog),
    ]);

    return sendJson(res, 200, {
      highSchool,
      elementarySchool,
      clergyOrdination,
      schoolVacancies,
      changeLog: sanitizeChangeLogRows(rawChangeLog),
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return sendJson(res, 502, { error: "Failed to load Google Sheet data" });
  }
}
