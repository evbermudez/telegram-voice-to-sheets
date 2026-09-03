import { existsSync, readFileSync } from "node:fs";

const REQUIRED = [
  "TELEGRAM_BOT_TOKEN",
  "OPENAI_API_KEY",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_SHEET_ID",
];

export function loadEnvFile(path = ".env", env = process.env) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (env[key] === undefined) env[key] = value;
  }
}

export function loadConfig(env = process.env, argv = process.argv.slice(2)) {
  const missing = REQUIRED.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const mode = argv.includes("--webhook") || env.APP_MODE === "webhook"
    ? "webhook"
    : "polling";

  if (mode === "webhook" && !env.TELEGRAM_WEBHOOK_SECRET?.trim()) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET is required in webhook mode");
  }

  return {
    mode,
    telegramToken: env.TELEGRAM_BOT_TOKEN.trim(),
    allowedChatId: env.ALLOWED_TELEGRAM_CHAT_ID?.trim() || null,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET?.trim() || null,
    publicUrl: env.PUBLIC_URL?.replace(/\/$/, "") || null,
    port: Number(env.PORT || 3000),
    openaiKey: env.OPENAI_API_KEY.trim(),
    transcriptionModel: env.OPENAI_TRANSCRIPTION_MODEL || "gpt-transcribe",
    extractionModel: env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini",
    googleCredentials: parseServiceAccount(env.GOOGLE_SERVICE_ACCOUNT_JSON),
    sheetId: env.GOOGLE_SHEET_ID.trim(),
    sheetRange: env.GOOGLE_SHEET_RANGE || "Leads!A:J",
  };
}

export function parseServiceAccount(value) {
  const trimmed = value.trim();
  const json = trimmed.startsWith("{")
    ? trimmed
    : Buffer.from(trimmed, "base64").toString("utf8");

  let credentials;
  try {
    credentials = JSON.parse(json);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON must be valid JSON or base64-encoded JSON");
  }

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("Google service-account JSON is missing client_email or private_key");
  }

  return credentials;
}
