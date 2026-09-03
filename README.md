# Telegram Voice → Google Sheets

A deliberately small job-application demo: send a Telegram voice note, transcribe it with OpenAI, extract clean lead details with Structured Outputs, and append a row to Google Sheets.

**Flow:** Telegram voice note → OpenAI transcription → structured lead extraction → Google Sheets row → Telegram confirmation

It uses only Node.js 20 built-ins. There are no runtime packages to install.

## What it extracts

| Column | Example |
| --- | --- |
| Received at | `2026-09-03T10:00:00.000Z` |
| Name | `Maya Chen` |
| Company | `Northstar Studio` |
| Email | `maya@example.com` |
| Phone | `+63 917 555 0123` |
| Interest | `Website redesign` |
| Budget | `$5,000` |
| Follow-up date | `2026-09-05` |
| Notes | Short context plus the transcript |
| Telegram | `@maya` |

Missing details stay blank. The extraction schema does not allow the model to add surprise fields.

## Quick start (polling)

Polling is the fastest local-demo path: no public URL, tunnel, or webhook setup.

### 1. Create the Telegram bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram.
2. Run `/newbot`, follow the prompts, and copy the bot token.
3. Open the new bot and press **Start**.

### 2. Prepare Google Sheets

1. Create a Google Cloud project and enable the **Google Sheets API**.
2. Create a service account and download its JSON key.
3. Create a spreadsheet with a tab named `Leads`.
4. Share the spreadsheet with the service account's `client_email` as **Editor**.
5. Copy the spreadsheet ID from its URL:

   ```text
   https://docs.google.com/spreadsheets/d/THIS_PART_IS_THE_ID/edit
   ```

The app creates the header row automatically when the tab is empty.

### 3. Configure the app

```bash
cp .env.example .env
```

Fill in `.env`. The app reads this file automatically:

```dotenv
TELEGRAM_BOT_TOKEN=123456:telegram-token
OPENAI_API_KEY=sk-...
GOOGLE_SERVICE_ACCOUNT_JSON=base64-encoded-service-account-json
GOOGLE_SHEET_ID=your-spreadsheet-id
GOOGLE_SHEET_RANGE=Leads!A:J
```

Generate the one-line base64 value with:

```bash
base64 < service-account.json | tr -d '\n'
```

Optional safety setting: message [@userinfobot](https://t.me/userinfobot), copy your numeric chat ID, and set `ALLOWED_TELEGRAM_CHAT_ID`. The bot will then ignore everyone else.

### 4. Run it

Node 20 or newer is required.

```bash
npm start
```

Send the bot a voice note such as:

> New lead: Maya Chen from Northstar Studio. She needs a website redesign, budget is around five thousand dollars. Her email is maya@example.com. Follow up this Friday. She prefers email.

The bot acknowledges the note, writes the structured row, then replies with a confirmation.

## Webhook mode (deployment)

Use this when deploying to a host that provides a permanent HTTPS URL.

Set the same variables as above, plus:

```dotenv
APP_MODE=webhook
PUBLIC_URL=https://your-app.example.com
TELEGRAM_WEBHOOK_SECRET=use-a-long-random-string
PORT=3000
```

Then run:

```bash
npm run start:webhook
```

On startup, the app registers `PUBLIC_URL/telegram` with Telegram and protects it with Telegram's secret-token header. `GET /health` is available for host health checks. The included `Dockerfile` starts the webhook mode automatically.

For a simple hosted demo:

1. Push this repository to GitHub.
2. Deploy it as a web service on your preferred Node/Docker host.
3. Add the environment variables in the host dashboard.
4. Set the health-check path to `/health`.

Only one mode should run for a bot at a time. Starting local polling removes the registered webhook; starting webhook mode registers it again.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Yes | — | Bot token from BotFather |
| `OPENAI_API_KEY` | Yes | — | OpenAI API key |
| `OPENAI_TRANSCRIPTION_MODEL` | No | `gpt-transcribe` | Speech-to-text model |
| `OPENAI_EXTRACTION_MODEL` | No | `gpt-4o-mini` | Structured extraction model |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Yes | — | Raw or base64 service-account JSON |
| `GOOGLE_SHEET_ID` | Yes | — | Spreadsheet ID |
| `GOOGLE_SHEET_RANGE` | No | `Leads!A:J` | Destination tab and columns |
| `ALLOWED_TELEGRAM_CHAT_ID` | No | — | Restrict the bot to one chat |
| `APP_MODE` | No | `polling` | Set to `webhook` when deployed |
| `PUBLIC_URL` | Webhook deploy | — | Public HTTPS origin; registers the webhook |
| `TELEGRAM_WEBHOOK_SECRET` | Webhook only | — | Verifies webhook requests |
| `PORT` | No | `3000` | Webhook server port |

## 60–90 second Loom script

1. **5 sec:** Show the sheet with only the header row.
2. **10 sec:** Briefly show the diagram in this README and say: “Voice in, structured lead out.”
3. **20 sec:** Record and send the sample voice note in Telegram.
4. **10 sec:** Show the bot's “transcribing and saving” acknowledgement.
5. **20 sec:** Refresh the sheet and point out the extracted name, company, interest, budget, and follow-up date.
6. **10 sec:** Show the Telegram success message and mention that missing fields remain blank rather than being invented.

Keep secrets and server logs off-screen. Pre-open Telegram and the spreadsheet side by side so the demo stays quick.

## Development

```bash
npm test
npm run check
```

Tests use Node's built-in test runner and do not call external services.

## Design choices

- **Two focused AI calls:** transcription and extraction are separate, making each step easy to inspect and replace.
- **Strict extraction:** OpenAI Structured Outputs constrains the result to the lead schema.
- **Direct APIs:** built-in `fetch` talks to Telegram, OpenAI, OAuth, and Google Sheets; no framework or SDK is required.
- **Service-account auth:** ideal for a single private demo sheet; no interactive Google OAuth flow.
- **Polling first:** the shortest path from clone to Loom. Webhooks are included for a hosted version.

## Limitations

This is intentionally a demo, not a CRM. It processes voice/audio messages sequentially in polling mode, keeps no database, and relies on Telegram update delivery rather than maintaining a durable job queue. A production version should add persistent idempotency, retries with backoff, observability, and per-user authorization.

## License

MIT
