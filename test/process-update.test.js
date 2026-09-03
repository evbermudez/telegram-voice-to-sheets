import assert from "node:assert/strict";
import test from "node:test";
import { createUpdateProcessor } from "../src/process-update.js";

test("processes a voice update and appends one row", async () => {
  const messages = [];
  const appended = [];
  const telegram = {
    sendMessage: async (_chatId, message) => messages.push(message),
    downloadFile: async () => ({
      bytes: new Uint8Array([1, 2, 3]).buffer,
      filename: "voice.ogg",
    }),
  };
  const config = {
    allowedChatId: null,
    openaiKey: "test-key",
    transcriptionModel: "test-transcription-model",
    extractionModel: "test-extraction-model",
    googleCredentials: {},
    sheetId: "sheet-id",
    sheetRange: "Leads!A:J",
  };
  const handleUpdate = createUpdateProcessor({
    config,
    telegram,
    transcribe: async () => "Maya from Northstar needs a website.",
    extract: async () => ({
      name: "Maya",
      company: "Northstar",
      email: null,
      phone: null,
      interest: "Website",
      budget: null,
      follow_up_date: null,
      notes: null,
    }),
    append: async (payload) => appended.push(payload),
  });
  const update = {
    update_id: 42,
    message: {
      date: 1_788_419_600,
      chat: { id: 123 },
      from: { username: "maya" },
      voice: { file_id: "voice-file", mime_type: "audio/ogg" },
    },
  };

  await handleUpdate(update);
  await handleUpdate(update);

  assert.equal(appended.length, 1, "duplicate Telegram updates are ignored");
  assert.equal(appended[0].row[1], "Maya");
  assert.equal(appended[0].row[9], "@maya");
  assert.deepEqual(messages, [
    "🎙️ Got it — transcribing and saving the lead…",
    "✅ Saved Maya to Google Sheets.",
  ]);
});
