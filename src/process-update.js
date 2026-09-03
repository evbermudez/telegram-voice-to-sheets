import { makeLeadRow } from "./google-sheets.js";

export function createUpdateProcessor({ config, telegram, transcribe, extract, append }) {
  const seenUpdateIds = new Set();

  return async function handleUpdate(update) {
    if (seenUpdateIds.has(update.update_id)) return;
    seenUpdateIds.add(update.update_id);
    if (seenUpdateIds.size > 1_000) {
      seenUpdateIds.delete(seenUpdateIds.values().next().value);
    }

    const message = update.message;
    const chatId = message?.chat?.id;

    if (!message || !chatId) return;
    if (config.allowedChatId && String(chatId) !== config.allowedChatId) {
      console.warn(`Ignored message from chat ${chatId}`);
      return;
    }

    const media = message.voice || message.audio;
    if (!media) {
      await telegram.sendMessage(chatId, "Send me a voice note and I’ll add the lead to Google Sheets.");
      return;
    }

    try {
      await telegram.sendMessage(chatId, "🎙️ Got it — transcribing and saving the lead…");
      const file = await telegram.downloadFile(media.file_id);
      const transcript = await transcribe({
        bytes: file.bytes,
        filename: file.filename,
        mimeType: message.voice?.mime_type || message.audio?.mime_type || "audio/ogg",
        apiKey: config.openaiKey,
        model: config.transcriptionModel,
      });
      const lead = await extract({
        transcript,
        apiKey: config.openaiKey,
        model: config.extractionModel,
      });
      const telegramUsername = message.from?.username
        ? `@${message.from.username}`
        : [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ");
      const receivedAt = new Date((message.date || Math.floor(Date.now() / 1000)) * 1000).toISOString();
      const row = makeLeadRow({ lead, receivedAt, telegramUsername, transcript });

      await append({
        credentials: config.googleCredentials,
        sheetId: config.sheetId,
        range: config.sheetRange,
        row,
      });

      await telegram.sendMessage(
        chatId,
        `✅ Saved${lead.name ? ` ${lead.name}` : " the lead"} to Google Sheets.`,
      );
    } catch (error) {
      console.error(`Update ${update.update_id} failed:`, error);
      await telegram.sendMessage(
        chatId,
        "❌ I couldn’t save that voice note. Check the server logs and try again.",
      ).catch((sendError) => console.error("Could not send failure message:", sendError.message));
    }
  };
}
