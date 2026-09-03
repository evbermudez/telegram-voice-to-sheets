import { fetchJson } from "./http.js";

export function normalizeAudioFilename(filename) {
  return filename.toLowerCase().endsWith(".oga")
    ? `${filename.slice(0, -4)}.ogg`
    : filename;
}

export function createTelegramClient(token) {
  const apiBase = `https://api.telegram.org/bot${token}`;
  const fileBase = `https://api.telegram.org/file/bot${token}`;

  async function call(method, body = {}) {
    const result = await fetchJson(`${apiBase}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return result.result;
  }

  return {
    call,
    sendMessage(chatId, text) {
      return call("sendMessage", { chat_id: chatId, text });
    },
    async downloadFile(fileId) {
      const file = await call("getFile", { file_id: fileId });
      const response = await fetch(`${fileBase}/${file.file_path}`);
      if (!response.ok) throw new Error(`Could not download Telegram file (${response.status})`);
      return {
        bytes: await response.arrayBuffer(),
        filename: normalizeAudioFilename(file.file_path.split("/").pop() || "voice.ogg"),
      };
    },
    setWebhook(url, secretToken) {
      return call("setWebhook", {
        url,
        secret_token: secretToken,
        allowed_updates: ["message"],
      });
    },
    deleteWebhook() {
      return call("deleteWebhook", { drop_pending_updates: false });
    },
  };
}

export async function runPolling({ telegram, handleUpdate, signal }) {
  await telegram.deleteWebhook();
  let offset = 0;
  console.log("Polling Telegram for voice messages…");

  while (!signal.aborted) {
    try {
      const updates = await telegram.call("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message"],
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(update);
      }
    } catch (error) {
      if (signal.aborted) break;
      console.error("Polling failed:", error.message);
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
}
