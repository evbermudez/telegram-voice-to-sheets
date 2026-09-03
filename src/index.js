import { appendLead } from "./google-sheets.js";
import { loadConfig, loadEnvFile } from "./config.js";
import { extractLead, transcribeAudio } from "./openai.js";
import { createUpdateProcessor } from "./process-update.js";
import { createTelegramClient, runPolling } from "./telegram.js";
import { startWebhookServer } from "./webhook.js";

async function main() {
  loadEnvFile();
  const config = loadConfig();
  const telegram = createTelegramClient(config.telegramToken);
  const handleUpdate = createUpdateProcessor({
    config,
    telegram,
    transcribe: transcribeAudio,
    extract: extractLead,
    append: appendLead,
  });

  if (config.mode === "webhook") {
    startWebhookServer({ port: config.port, secret: config.webhookSecret, handleUpdate });
    if (config.publicUrl) {
      await telegram.setWebhook(`${config.publicUrl}/telegram`, config.webhookSecret);
      console.log(`Telegram webhook set to ${config.publicUrl}/telegram`);
    } else {
      console.log("PUBLIC_URL is unset; register the /telegram webhook yourself.");
    }
    return;
  }

  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());
  process.once("SIGTERM", () => controller.abort());
  await runPolling({ telegram, handleUpdate, signal: controller.signal });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
