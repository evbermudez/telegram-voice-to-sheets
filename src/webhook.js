import { createServer } from "node:http";

export function startWebhookServer({ port, secret, handleUpdate }) {
  const server = createServer(async (request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    if (request.method !== "POST" || request.url !== "/telegram") {
      response.writeHead(404).end();
      return;
    }

    if (request.headers["x-telegram-bot-api-secret-token"] !== secret) {
      response.writeHead(401).end();
      return;
    }

    try {
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 1_000_000) throw new Error("Request body too large");
        chunks.push(chunk);
      }
      const update = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      response.writeHead(200).end();
      void handleUpdate(update);
    } catch (error) {
      console.error("Invalid webhook request:", error.message);
      if (!response.headersSent) response.writeHead(400).end();
    }
  });

  server.listen(port, () => console.log(`Webhook server listening on port ${port}`));
  return server;
}
