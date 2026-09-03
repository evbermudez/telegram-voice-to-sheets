import assert from "node:assert/strict";
import test from "node:test";
import { getResponseText } from "../src/openai.js";

test("reads structured text from a raw Responses API payload", () => {
  const text = getResponseText({
    output: [{ content: [{ type: "output_text", text: "{\"name\":\"Maya\"}" }] }],
  });
  assert.equal(text, '{"name":"Maya"}');
});

test("returns null when a response has no output text", () => {
  assert.equal(getResponseText({ output: [] }), null);
});
