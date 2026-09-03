import { createSign } from "node:crypto";
import { fetchJson } from "./http.js";

export const HEADERS = [
  "Received at",
  "Name",
  "Company",
  "Email",
  "Phone",
  "Interest",
  "Budget",
  "Follow-up date",
  "Notes",
  "Telegram",
];

let cachedToken = null;

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

export async function getAccessToken(credentials, now = Date.now()) {
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const issuedAt = Math.floor(now / 1000);
  const tokenUri = credentials.token_uri || "https://oauth2.googleapis.com/token";
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: tokenUri,
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = `${unsigned}.${signer.sign(credentials.private_key, "base64url")}`;

  const params = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const result = await fetchJson(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  cachedToken = {
    value: result.access_token,
    expiresAt: now + Number(result.expires_in || 3600) * 1000,
  };
  return cachedToken.value;
}

export function makeLeadRow({ lead, receivedAt, telegramUsername, transcript }) {
  const notes = [lead.notes, `Transcript: ${transcript}`].filter(Boolean).join(" | ");
  return [
    receivedAt,
    lead.name || "",
    lead.company || "",
    lead.email || "",
    lead.phone || "",
    lead.interest || "",
    lead.budget || "",
    lead.follow_up_date || "",
    notes,
    telegramUsername || "",
  ];
}

export async function appendLead({ credentials, sheetId, range, row }) {
  const token = await getAccessToken(credentials);
  await ensureHeaders({ token, sheetId, range });

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}`
    + `/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  return fetchJson(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [row] }),
  });
}

async function ensureHeaders({ token, sheetId, range }) {
  const sheetName = range.includes("!") ? range.split("!")[0] : "Sheet1";
  const headerRange = `${sheetName}!A1:J1`;
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values`;
  const current = await fetchJson(`${base}/${encodeURIComponent(headerRange)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (current.values?.[0]?.length) return;

  await fetchJson(`${base}/${encodeURIComponent(headerRange)}?valueInputOption=RAW`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [HEADERS] }),
  });
}
