// Prompt builder for Shokhi's personalised, ON-DEMAND Gemma features. Each returns a
// {system, user, fallback}: Gemma writes the warm text; the `fallback` is a deterministic
// version used when there's no API key (mock backend), so the feature still shows something.
//
// PRINCIPLE (unchanged): Gemma is used only for LANGUAGE / personalisation / explanation.
// Predictions, urgency and safety stay deterministic elsewhere and are passed in as facts.

type Lang = "bn" | "en";
export type PersonalKind = "today" | "cycle" | "report" | "mood" | "family";

const BASE =
  "You are Shokhi (সখী), a warm, respectful Bangla-first women's health companion for women in " +
  "Bangladesh, including those with little schooling. You are NOT a doctor and never give a firm " +
  "diagnosis, medicine names or doses. Be gentle, non-judgemental and encouraging. Keep it short.";

export function buildPersonal(kind: PersonalKind, data: any, lang: Lang): { system: string; user: string; fallback: string } {
  const en = lang === "en";
  switch (kind) {
    case "today":
      return {
        system: BASE + " Write a SHORT personal note for TODAY (3–4 sentences). Gently mention her cycle phase, acknowledge her mood if given, then suggest ONE gentle movement and ONE simple food idea that suit her right now. End warmly. No diagnosis, no medicines.",
        user: `Facts about her today (JSON):\n${JSON.stringify(data)}\n\nWrite Shokhi's warm note for today.`,
        fallback: en
          ? "Take today gently. Based on where you are in your cycle, a little stretching or a short walk can help, along with iron-rich, warm food. Be kind to yourself — you're doing well. 🤍"
          : "আজকের দিনটা ধীরে-সুস্থে কাটান। আপনার চক্রের এই সময়ে হালকা স্ট্রেচিং বা একটু হাঁটা ভালো লাগবে, সাথে আয়রন-সমৃদ্ধ গরম খাবার। নিজের প্রতি নরম থাকুন — আপনি ভালোই করছেন। 🤍",
      };
    case "cycle":
      return {
        system: BASE + " Explain this cycle summary in very simple, spoken-style language. Say kindly what it means for her, and gently when it's worth seeing a doctor. Do NOT invent any numbers beyond what is given.",
        user: `Her cycle summary (already computed by rules, JSON):\n${JSON.stringify(data)}\n\nExplain it warmly and simply.`,
        fallback: (data?.insights_bn || data?.insights || []).join(" ") ||
          (en ? "Log a couple of periods and I'll explain your cycle in simple words." : "কয়েকটি মাসিক লিখুন, আমি সহজ ভাষায় আপনার চক্র বুঝিয়ে দেব।"),
      };
    case "report":
      return {
        system: BASE + " A woman shares a health test result (she typed it). In simple words, explain what each value generally means and whether it seems low, normal or high, and whether she should see a doctor. This is GENERAL information, not a diagnosis — always tell her to confirm with a doctor. Never give medicines or doses. If a value looks seriously off, clearly tell her to see a doctor soon.",
        user: `Her test result (typed):\n${String(data?.text || "").slice(0, 1500)}\n\nExplain it kindly and simply.`,
        fallback: en
          ? "Please show this report to a doctor or health worker — they can explain what it means for you and what to do next."
          : "দয়া করে এই রিপোর্টটি একজন ডাক্তার বা স্বাস্থ্যকর্মীকে দেখান — তিনি বুঝিয়ে দেবেন এর অর্থ কী এবং পরে কী করতে হবে।",
      };
    case "mood":
      return {
        system: BASE + " She logged how she is feeling. Give a SHORT (2–3 sentences), warm, validating, NON-clinical reflection — like a caring friend — and ONE gentle coping idea. Never dismiss her feelings; never diagnose.",
        user: `How she feels today (JSON):\n${JSON.stringify(data)}\n\nWrite a warm, validating reflection.`,
        fallback: en
          ? "What you're feeling is real and valid — thank you for noticing it. Be gentle with yourself today; a few slow breaths, a little rest, or talking to someone you trust can help. This feeling will pass. 🤍"
          : "আপনি যা অনুভব করছেন তা সত্যি ও গুরুত্বপূর্ণ — খেয়াল করার জন্য ধন্যবাদ। আজ নিজের প্রতি নরম থাকুন; কয়েকটি ধীর শ্বাস, একটু বিশ্রাম, বা বিশ্বস্ত কাউকে বলা সাহায্য করতে পারে। এই অনুভূতি কেটে যাবে। 🤍",
      };
    case "family":
      return {
        system: BASE + " Write a short, respectful message she can SHOW her family, explaining that her period/PMS mood changes are natural and real (not attitude), and how they can support her with patience, kind words and rest. Warm and simple. Address the family, not her.",
        user: `Her situation (JSON, may be sparse):\n${JSON.stringify(data)}\n\nWrite the message for her family.`,
        fallback: en
          ? "A note for family: before and during her period, natural hormone changes can bring mood swings, sadness or irritability. This is real — she isn't being difficult on purpose. Patience, kind words and a little rest help the most."
          : "পরিবারের জন্য: মাসিকের আগে ও সময়ে হরমোনের স্বাভাবিক পরিবর্তনে মেজাজ ওঠানামা, মন খারাপ বা খিটখিটে ভাব আসতে পারে। এটি সত্যি — সে ইচ্ছে করে জেদ করছে না। ধৈর্য, নরম কথা আর একটু বিশ্রাম সবচেয়ে বেশি সাহায্য করে।",
      };
  }
}

/**
 * Deterministic critical-value check on a typed lab report — so Shokhi never "under-flags" a
 * dangerous result even if the LLM phrasing is soft. Currently catches severe/low haemoglobin.
 */
export function detectCriticalLab(text: string): { level: "urgent" | "low" | null; note_bn: string; note_en: string } {
  // normalise Bangla digits to ASCII so "১০" is read as 10
  const BN = "০১২৩৪৫৬৭৮৯";
  const norm = (text || "").replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
  const m = norm.match(/(?:h(?:ae|e)?moglobin|h\.?b\.?|হিমোগ্লোবিন|এইচবি)\D{0,6}(\d{1,2}(?:\.\d)?)/i);
  if (m) {
    const hb = parseFloat(m[1]);
    if (!Number.isNaN(hb) && hb > 0 && hb < 7) {
      return { level: "urgent", note_bn: "আপনার হিমোগ্লোবিন অনেক কম — এটি তীব্র রক্তস্বল্পতা হতে পারে। যত দ্রুত সম্ভব ডাক্তার দেখান।", note_en: "Your haemoglobin looks very low — this can be severe anaemia. Please see a doctor as soon as possible." };
    }
    if (!Number.isNaN(hb) && hb >= 7 && hb < 11) {
      return { level: "low", note_bn: "আপনার হিমোগ্লোবিন কম মনে হচ্ছে (রক্তস্বল্পতা)। আয়রন-সমৃদ্ধ খাবার খান এবং ডাক্তারের পরামর্শ নিন।", note_en: "Your haemoglobin seems low (anaemia). Eat iron-rich foods and check with a doctor." };
    }
  }
  return { level: null, note_bn: "", note_en: "" };
}
