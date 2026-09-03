import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, loadEnvFile, parseServiceAccount } from "../src/config.js";

const credentials = {
  client_email: "bot@example.iam.gserviceaccount.com",
  private_key: "not-a-real-private-key",
};

test("parses base64 service-account JSON", () => {
  const encoded = Buffer.from(JSON.stringify(credentials)).toString("base64");
  assert.deepEqual(parseServiceAccount(encoded), credentials);
});

test("loads values from a local env file without overriding the environment", () => {
  const directory = mkdtempSync(join(tmpdir(), "voice-to-sheets-"));
  const path = join(directory, ".env");
  writeFileSync(path, "# demo\nFIRST=from-file\nSECOND=two=parts\n");
  const env = { FIRST: "already-set" };

  loadEnvFile(path, env);

  assert.deepEqual(env, { FIRST: "already-set", SECOND: "two=parts" });
});

test("defaults to polling mode", () => {
  const config = loadConfig({
    TELEGRAM_BOT_TOKEN: "telegram",
    OPENAI_API_KEY: "openai",
    GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(credentials),
    GOOGLE_SHEET_ID: "sheet",
  }, []);

  assert.equal(config.mode, "polling");
  assert.equal(config.sheetRange, "Leads!A:J");
});

test("requires a secret in webhook mode", () => {
  assert.throws(() => loadConfig({
    TELEGRAM_BOT_TOKEN: "telegram",
    OPENAI_API_KEY: "openai",
    GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify(credentials),
    GOOGLE_SHEET_ID: "sheet",
  }, ["--webhook"]), /TELEGRAM_WEBHOOK_SECRET/);
});
