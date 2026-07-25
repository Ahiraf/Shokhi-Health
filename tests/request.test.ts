import { describe, expect, it } from "vitest";
import {
  MAX_HISTORY_ITEMS,
  MAX_MESSAGE_LENGTH,
  readHistory,
  readProfile,
  readText,
} from "../lib/server/request";
import { withGeminiKeyFallback } from "../lib/server/gemma";

describe("API request guards", () => {
  it("rejects empty and oversized required text", () => {
    expect(readText({ message: "   " }, "message", MAX_MESSAGE_LENGTH, true)).toBeNull();
    expect(readText({ message: "x".repeat(MAX_MESSAGE_LENGTH + 1) }, "message", MAX_MESSAGE_LENGTH, true)).toBeNull();
  });

  it("keeps only bounded history strings", () => {
    const history = readHistory([
      ...Array.from({ length: MAX_HISTORY_ITEMS + 2 }, (_, i) => `message ${i}`),
      { invalid: true },
    ]);
    expect(history).toHaveLength(MAX_HISTORY_ITEMS);
    expect(history[0]).toBe("message 2");
  });

  it("keeps primitive profile values and ignores nested objects", () => {
    expect(readProfile({ age: 24, cycles_irregular: true, nested: {} })).toEqual({
      age: 24,
      cycles_irregular: true,
    });
  });
});

describe("Google API key fallback", () => {
  it("moves to the next configured key after a quota error", async () => {
    const previous = [process.env.GOOGLE_API_KEY, process.env.GOOGLE_API_KEY_2, process.env.GOOGLE_API_KEY_3];
    process.env.GOOGLE_API_KEY = "test-key-1";
    process.env.GOOGLE_API_KEY_2 = "test-key-2";
    process.env.GOOGLE_API_KEY_3 = "test-key-3";
    const calls: number[] = [];
    try {
      const result = await withGeminiKeyFallback(async (_key, index) => {
        calls.push(index);
        if (index === 0) throw new Error("429 quota exceeded");
        return "ok";
      });
      expect(result).toBe("ok");
      expect(calls).toEqual([0, 1]);
    } finally {
      ["GOOGLE_API_KEY", "GOOGLE_API_KEY_2", "GOOGLE_API_KEY_3"].forEach((name, index) => {
        const value = previous[index];
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      });
    }
  });
});
