import { fetchJson } from "./http.js";

const LEAD_SCHEMA = {
  type: "object",
  properties: {
    name: { type: ["string", "null"] },
    company: { type: ["string", "null"] },
    email: { type: ["string", "null"] },
    phone: { type: ["string", "null"] },
    interest: { type: ["string", "null"] },
    budget: { type: ["string", "null"] },
    follow_up_date: {
      type: ["string", "null"],
      description: "ISO date (YYYY-MM-DD) when the speaker clearly provides one",
    },
    notes: { type: ["string", "null"] },
  },
  required: [
    "name",
    "company",
    "email",
    "phone",
    "interest",
    "budget",
    "follow_up_date",
    "notes",
  ],
  additionalProperties: false,
};

export async function transcribeAudio({ bytes, filename, mimeType, apiKey, model }) {
  const form = new FormData();
  form.append("model", model);
  form.append("file", new Blob([bytes], { type: mimeType }), filename);

  const result = await fetchJson("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!result.text?.trim()) {
    throw new Error("OpenAI returned an empty transcript");
  }

  return result.text.trim();
}

export async function extractLead({ transcript, apiKey, model, today = new Date() }) {
  const response = await fetchJson("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            "Extract lead or customer details from a transcribed voice note.",
            "Never invent missing information; use null instead.",
            `Today is ${today.toISOString().slice(0, 10)}. Resolve relative follow-up dates from this date.`,
            "Keep notes brief and useful. Do not repeat details already captured in another field.",
          ].join(" "),
        },
        { role: "user", content: transcript },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "lead",
          strict: true,
          schema: LEAD_SCHEMA,
        },
      },
    }),
  });

  const outputText = getResponseText(response);
  if (!outputText) {
    throw new Error("OpenAI returned no structured extraction");
  }

  return JSON.parse(outputText);
}

export function getResponseText(response) {
  if (typeof response.output_text === "string") return response.output_text;

  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}
