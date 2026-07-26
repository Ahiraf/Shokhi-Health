import { describe, expect, it } from "vitest";
import { buildPersonal } from "../lib/server/personal";
import { extractLabValues, makeReportRecord } from "../lib/report-history";

describe("Gemma feature extensions", () => {
  it("asks typed report explanations for structured sections", () => {
    const prompt = buildPersonal("report", { text: "Hemoglobin 9.5, TSH 4.2" }, "en");
    expect(prompt.system).toContain("## সহজ সারাংশ");
    expect(prompt.system).toContain("## ডাক্তারের কাছে জিজ্ঞেস করুন");
    expect(prompt.fallback).toContain("## Key takeaway");
  });

  it("personalises the family audience and weekly companion", () => {
    const family = buildPersonal("family", { audience: "partner", phase: "luteal" }, "bn");
    expect(family.system).toContain("তার সঙ্গী");
    expect(family.user).toContain("partner");

    const weekly = buildPersonal("weekly", { cycleDay: 12, moodCounts: { low: 2 } }, "en");
    expect(weekly.system).toContain("## Gentle priorities");
    expect(weekly.fallback).toContain("## This week");
  });

  it("extracts common typed report values for local comparison", () => {
    const values = extractLabValues("হিমোগ্লোবিন ৯.৫ g/dL, TSH ৪.২, Platelet ৪৪২");
    expect(values.map((value) => value.key)).toEqual(["haemoglobin", "tsh", "platelets"]);
    expect(values[0].value).toBe(9.5);
    expect(makeReportRecord({ source: "typed", label: "test", input: "Hb 9.5", analysis: "## Summary" }).values[0].value).toBe(9.5);
  });
});
