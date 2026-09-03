import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAudioFilename } from "../src/telegram.js";

test("normalizes Telegram OGA voice filenames for transcription", () => {
  assert.equal(normalizeAudioFilename("file_42.oga"), "file_42.ogg");
  assert.equal(normalizeAudioFilename("FILE_42.OGA"), "FILE_42.ogg");
});

test("preserves already-supported audio filenames", () => {
  assert.equal(normalizeAudioFilename("voice.ogg"), "voice.ogg");
  assert.equal(normalizeAudioFilename("recording.mp3"), "recording.mp3");
});
