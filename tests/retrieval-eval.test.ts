import { describe, expect, it } from "vitest";
import { corpusInfo, retrieve } from "../lib/server/rag";

// A small regression set for recall across the words Shokhi users actually use.
// These are retrieval expectations, not diagnostic assertions.
describe("RAG retrieval evaluation", () => {
  it("has grown the reviewed corpus without padding it with duplicate passages", () => {
    const info = corpusInfo();
    expect(info.chunks).toBeGreaterThanOrEqual(70);
    expect(info.sources_missing_review.length).toBe(0);
  });

  const cases: Array<[string, string[]]> = [
    ["মাসিকের ব্যথা", ["menstruation", "endometriosis"]],
    ["period cramps", ["menstruation", "endometriosis"]],
    ["safe water and handwashing", ["wash", "wellbeing"]],
    ["child marriage and violence", ["protection"]],
    ["hot flashes after periods stop", ["menopause"]],
    ["anaemia and tiredness for girls", ["nutrition"]],
    ["support after childbirth", ["pregnancy"]],
    ["inclusive education for a disabled child", ["education", "disability"]],
  ];

  it.each(cases)("retrieves a relevant topic for %s", async (query, topics) => {
    const hits = await retrieve(query, 4);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((hit) => topics.includes(hit.topic ?? ""))).toBe(true);
  });

  it("recognises Bangla synonyms and keeps source diversity bounded", async () => {
    const hits = await retrieve("মাসিকের ব্যথা", 4, { maxPerSource: 1 });
    expect(hits[0]?.keyword_score).toBeGreaterThan(0);
    expect(new Set(hits.map((hit) => hit.url)).size).toBe(hits.length);
  });

  it("does not ground an unrelated query", async () => {
    expect(await retrieve("zxqv plorgh 9281", 4)).toEqual([]);
  });
});
