import type { StringKey } from "@/lib/i18n";

// Shared site navigation. Some top-level items are DROPDOWN GROUPS (a label + children) so the
// nav stays lean: "Learn" opens Conditions + Guides, and "Tracker" opens each tracker feature as
// its own page. Labels are i18n keys so the whole nav switches with the Bangla/English toggle.
export type NavLeaf = { href: string; key: StringKey };
export type NavNode = NavLeaf | { key: StringKey; children: NavLeaf[] };

export const NAV: NavNode[] = [
  { href: "/", key: "nav.home" },
  { href: "/chat", key: "nav.chat" },
  {
    key: "nav.learn",
    children: [
      { href: "/learn", key: "nav.learn.conditions" },
      { href: "/guides", key: "nav.guides" },
    ],
  },
  {
    key: "nav.tracker",
    children: [
      { href: "/tracker", key: "nav.tracker.period" },
      { href: "/tracker/today", key: "nav.tracker.today" },
      { href: "/tracker/mood", key: "nav.tracker.mood" },
      { href: "/tracker/reminder", key: "nav.tracker.pad" },
    ],
  },
  { href: "/myths", key: "nav.myths" },
  { href: "/wellness", key: "nav.wellness" },
  { href: "/report", key: "nav.report" },
  { href: "/hotline", key: "nav.hotline" },
  { href: "/faq", key: "nav.faq" },
];

/** Flattened leaf links (dropdowns expanded) — used by the mobile menu and the footer. */
export const NAV_LINKS: NavLeaf[] = NAV.flatMap((n) => ("children" in n ? n.children : [n]));
