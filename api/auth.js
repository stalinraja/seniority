import { clearSessionCookie, createSessionCookie, isAuthConfigured, sendJson, validatePassword } from "./_shared.js";

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return sendJson(res, 200, { authRequired: isAuthConfigured() });
  }

  if (req.method === "DELETE") {
    res.setHeader("set-cookie", clearSessionCookie());
    return sendJson(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("allow", "GET, POST, DELETE");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const body = await readJson(req);
  if (!validatePassword(body.password)) {
    return sendJson(res, 401, { error: "Invalid password" });
  }

  res.setHeader("set-cookie", createSessionCookie());
  return sendJson(res, 200, { ok: true });
}
