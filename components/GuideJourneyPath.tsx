"use client";

import Link from "next/link";
import { useLang } from "./LanguageProvider";
import Icon from "./Icon";

type Path = {
  start_bn: string;
  start_en: string;
  next_bn: string;
  next_en: string;
  help_bn: string;
  help_en: string;
};

const PATHS: Record<string, Path> = {
  first_period: {
    start_bn: "আপনি একা নন — প্রথম মাসিক স্বাভাবিক বড় হয়ে ওঠার অংশ।",
    start_en: "You are not alone — a first period is a normal part of growing up.",
    next_bn: "একটি পরিষ্কার প্যাড বা নরম কাপড় নিন, বদলানোর তারিখ লিখুন এবং বিশ্বস্ত বড় কাউকে বলুন।",
    next_en: "Use a clean pad or soft cloth, note the date, and tell a trusted adult.",
    help_bn: "অসহনীয় ব্যথা, খুব বেশি রক্ত, মাথা ঘোরা বা ১৫ বছরেও মাসিক না হলে সাহায্য নিন।",
    help_en: "Ask for help for unbearable pain, very heavy bleeding, dizziness, or no period by 15.",
  },
  period_pain: {
    start_bn: "হালকা থেকে মাঝারি মুচড়ানো ব্যথা অনেকের হয়, কিন্তু আপনার কষ্টকে ছোট করে দেখবেন না।",
    start_en: "Mild-to-moderate cramping is common, but your pain still deserves to be taken seriously.",
    next_bn: "গরম সেঁক, বিশ্রাম ও হালকা নড়াচড়া চেষ্টা করুন; ব্যথা কখন হয় লিখে রাখুন।",
    next_en: "Try heat, rest and gentle movement; note when the pain happens.",
    help_bn: "ব্যথা অসহনীয় হলে, মাসিক ছাড়াও হলে, জ্বর/অজ্ঞানভাব থাকলে বা কাজ-স্কুল বন্ধ হলে ডাক্তার দেখান।",
    help_en: "See a doctor for unbearable pain, pain outside periods, fever/fainting, or pain that stops daily life.",
  },
  avoid_pregnancy: {
    start_bn: "সবার শরীর ও পছন্দ আলাদা — কোনো একটি পদ্ধতি সবার জন্য সেরা নয়।",
    start_en: "Bodies and priorities differ — there is no single best method for everyone.",
    next_bn: "আপনার স্বাস্থ্য, বুকের দুধ খাওয়ানো, STI সুরক্ষা ও কতদিন মনে রাখতে চান — এগুলো ভাবুন।",
    next_en: "Think about health, breastfeeding, STI protection, and how often you want to remember a method.",
    help_bn: "পিল ভুলে গেলে বা অসুরক্ষিত সহবাস হলে নিচের পিল-সহায়কটি ব্যবহার করে দ্রুত স্বাস্থ্যকর্মীর পরামর্শ নিন।",
    help_en: "If a pill was missed or sex was unprotected, use the helper below and seek prompt advice.",
  },
  plan_pregnancy: {
    start_bn: "সন্তান নেওয়ার সময় ও ব্যবধানের সিদ্ধান্ত আপনার এবং আপনার সঙ্গীর।",
    start_en: "The timing and spacing of pregnancy is a decision for you and your partner.",
    next_bn: "স্বাস্থ্যকর্মীর সাথে আগে কথা বলুন; রক্তস্বল্পতা, দীর্ঘমেয়াদি রোগ ও ওষুধের বিষয় জানিয়ে দিন।",
    next_en: "Talk with a health worker first, including about anaemia, long-term illness and medicines.",
    help_bn: "এক বছর চেষ্টা করেও না হলে (৩৫-এর বেশি হলে ৬ মাস), বা আগে থেকেই রোগ থাকলে ডাক্তার দেখান।",
    help_en: "See a doctor after 1 year of trying (6 months if over 35), or sooner with a health condition.",
  },
  pregnant_now: {
    start_bn: "প্রথমে পরীক্ষা করে নিশ্চিত হন এবং যত তাড়াতাড়ি সম্ভব গর্ভকালীন চেকআপ নিন।",
    start_en: "Confirm with a test and arrange antenatal care as early as you can.",
    next_bn: "শেষ মাসিকের তারিখ লিখে রাখুন এবং আপনার সব ওষুধ/রোগের কথা স্বাস্থ্যকর্মীকে বলুন।",
    next_en: "Note the first day of your last period and tell the health worker about medicines and illnesses.",
    help_bn: "রক্তপাত, তীব্র মাথাব্যথা, ঝাপসা দেখা, হঠাৎ ফোলা, খিঁচুনি বা শিশুর নড়াচড়া কম হলে জরুরি সাহায্য নিন।",
    help_en: "Get urgent help for bleeding, severe headache, blurred vision, sudden swelling, fits, or reduced movement.",
  },
  after_birth: {
    start_bn: "প্রসবের পর মায়ের শরীর ও মনকে সুস্থ হতে সময় ও সহায়তা দরকার।",
    start_en: "After birth, the mother’s body and mind need time and support to recover.",
    next_bn: "রক্তপাত, জ্বর, মন খারাপ ও বুকের দুধ খাওয়ানো নিয়ে স্বাস্থ্যকর্মীর সাথে কথা বলুন।",
    next_en: "Talk with a health worker about bleeding, fever, mood, and breastfeeding.",
    help_bn: "অতিরিক্ত রক্তপাত, জ্বর, দুর্গন্ধযুক্ত স্রাব বা নিজেকে ক্ষতি করার চিন্তা হলে দ্রুত সাহায্য নিন।",
    help_en: "Seek prompt help for heavy bleeding, fever, foul discharge, or thoughts of self-harm.",
  },
  understand_symptoms: {
    start_bn: "একটি উপসর্গ মানেই নিশ্চিত কোনো রোগ নয় — বোঝার জন্য কয়েকটি প্রশ্ন দরকার।",
    start_en: "One symptom does not confirm a condition — a few questions help put it in context.",
    next_bn: "কখন শুরু হয়েছে, কতবার হয়, দৈনন্দিন কাজে বাধা দেয় কি না — এগুলো লিখে রাখুন।",
    next_en: "Note when it started, how often it happens, and whether it disrupts daily life.",
    help_bn: "জরুরি লক্ষণ থাকলে এখনই সাহায্য নিন; না হলে সেল্ফ-চেক বা সখীর সাথে আলোচনা করুন।",
    help_en: "Get urgent help for red flags; otherwise use the self-check or discuss it with Shokhi.",
  },
};

export default function GuideJourneyPath({ journey, guideId }: { journey: string; guideId: string }) {
  const { lang } = useLang();
  const path = PATHS[journey] ?? PATHS.understand_symptoms;
  const en = lang === "en";
  const items = [
    { title: en ? "Start here" : "এখান থেকে শুরু", body: en ? path.start_en : path.start_bn, icon: "heart" as const, tone: "bg-rose-mist" },
    { title: en ? "Next step" : "পরের কাজ", body: en ? path.next_en : path.next_bn, icon: "chevron" as const, tone: "bg-sage-soft" },
    { title: en ? "Get help if…" : "সাহায্য নেবেন যদি…", body: en ? path.help_en : path.help_bn, icon: "shield" as const, tone: "bg-apricot-soft" },
  ];

  return (
    <section className="mt-6 rounded-3xl bg-blush/60 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl bg-surface/80 p-4 ring-1 ring-rose-soft/70">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${item.tone} text-rose-deep`}>
              <Icon name={item.icon} size={17} />
            </span>
            <h2 className="mt-3 text-sm font-bold text-plum">{item.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-plum/70">{item.body}</p>
          </div>
        ))}
      </div>
      {guideId !== "contraception" && (
        <Link href="/chat" className="mt-4 inline-flex rounded-full bg-rose px-4 py-2 text-sm font-semibold text-accentink">
          {en ? "Ask Shokhi privately" : "সখীকে ব্যক্তিগতভাবে জিজ্ঞাসা করুন"}
        </Link>
      )}
    </section>
  );
}
