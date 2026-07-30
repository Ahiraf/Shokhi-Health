import type { StringKey } from "@/lib/i18n";

// Shared site navigation. Wellness owns the personal companion pages, while Tracker stays
// focused on cycle and reminder tools. Labels are i18n keys so the nav switches with language.
export type NavLeaf = { href: string; key: StringKey };
export type NavNode = NavLeaf | { key: StringKey; children: NavLeaf[] };

export const NAV: NavNode[] = [
  { href: "/", key: "nav.home" },
  { href: "/chat", key: "nav.chat" },
  {
    key: "nav.tracker",
    children: [
      { href: "/tracker", key: "nav.tracker.period" },
      { href: "/tracker/reminder", key: "nav.tracker.pad" },
    ],
  },
  { href: "/learn", key: "nav.learn.conditions" },
  {
    key: "nav.wellness",
    children: [
      { href: "/tracker/today", key: "nav.tracker.today" },
      { href: "/tracker/mood", key: "nav.tracker.mood" },
      { href: "/wellness", key: "nav.wellness.overview" },
    ],
  },
  { href: "/report", key: "nav.report" },
  { href: "/myths", key: "nav.myths" },
  { href: "/faq", key: "nav.faq" },
];

/** Flattened leaf links (dropdowns expanded) — used by the mobile menu and the footer. */
export const NAV_LINKS: NavLeaf[] = NAV.flatMap((n) => ("children" in n ? n.children : [n]));
