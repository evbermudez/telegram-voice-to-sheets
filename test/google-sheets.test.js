import assert from "node:assert/strict";
import test from "node:test";
import { makeLeadRow } from "../src/google-sheets.js";

test("maps extracted lead data to the sheet columns", () => {
  const row = makeLeadRow({
    lead: {
      name: "Maya Chen",
      company: "Northstar",
      email: "maya@example.com",
      phone: null,
      interest: "Website redesign",
      budget: "$5,000",
      follow_up_date: "2026-09-05",
      notes: "Prefers email",
    },
    receivedAt: "2026-09-03T10:00:00.000Z",
    telegramUsername: "@maya",
    transcript: "Maya from Northstar needs a website redesign.",
  });

  assert.equal(row.length, 10);
  assert.equal(row[1], "Maya Chen");
  assert.equal(row[4], "");
  assert.match(row[8], /Transcript:/);
});
