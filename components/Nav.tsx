"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV, NAV_LINKS } from "@/lib/nav";
import { useLang } from "./LanguageProvider";
import { useTheme } from "./ThemeProvider";
import NotificationBell from "./NotificationBell";
import Icon from "./Icon";

/** Sticky top navigation shared across every page, with dropdown groups + a mobile menu. */
export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null); // open dropdown group (desktop)
  const { t, lang, toggle } = useLang();
  const { theme, toggle: toggleTheme } = useTheme();

  // Active = the LONGEST matching nav link, so /tracker doesn't stay lit on /tracker/reminder
  // (its sibling is a more specific match), while /wellness still lights on /wellness/move/x.
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (!matches) return false;
    return !NAV_LINKS.some(
      (l) =>
        l.href !== href &&
        l.href.startsWith(href + "/") &&
        (pathname === l.href || pathname.startsWith(l.href + "/")),
    );
  };

  const themeLabel = t(theme === "dark" ? "nav.lightMode" : "nav.darkMode");
  const themeButton = (
    <button
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-plum ring-1 ring-rose-soft transition hover:bg-blush"
      aria-label={themeLabel}
      title={themeLabel}
    >
      {theme === "dark" ? (
        // sun — currently dark, tap for light
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // crescent half-moon — currently light, tap for dark
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );

  const langButton = (extra: string) => (
    <button
      onClick={toggle}
      className={`rounded-full px-3 py-1.5 text-sm font-bold text-plum ring-1 ring-rose-soft transition hover:bg-blush ${extra}`}
      aria-label={lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
      title={lang === "bn" ? "Switch to English" : "বাংলায় দেখুন"}
    >
      {t("nav.langLabel")}
    </button>
  );

  const profileButton = (
    <Link
      href="/profile"
      onClick={() => setOpen(false)}
      className={`flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-rose-soft transition ${
        isActive("/profile") ? "bg-rose text-accentink" : "bg-surface text-plum hover:bg-blush"
      }`}
      aria-label={t("nav.profile")}
      title={t("nav.profile")}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-rose-soft/70 bg-cream/85 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-rose-soft">
            <Image
              src="/shokhi-mark.png"
              alt="Shokhi logo"
              width={36}
              height={36}
              className="h-full w-full object-cover"
              priority
            />
          </span>
          <span className="font-display text-lg font-bold text-plum">সখী</span>
        </Link>

        {/* desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV.map((n) =>
            "children" in n ? (
              <li
                key={n.key}
                className="relative"
                onMouseEnter={() => setMenu(n.key)}
                onMouseLeave={() => setMenu(null)}
              >
                <button
                  onClick={() => setMenu((m) => (m === n.key ? null : n.key))}
                  aria-expanded={menu === n.key}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    n.children.some((c) => isActive(c.href))
                      ? "bg-rose text-accentink"
                      : "text-plum/60 hover:bg-blush hover:text-plum"
                  }`}
                >
                  {t(n.key)}
                  <Icon name="chevron" size={13} className={`rotate-90 transition ${menu === n.key ? "-scale-y-100" : ""}`} />
                </button>
                {menu === n.key && (
                  // pt-1 is a hoverable "bridge" so moving from the button to the panel doesn't
                  // cross an empty gap (which would fire mouseleave and close the menu)
                  <div className="absolute left-0 top-full z-50 pt-1">
                    <ul className="min-w-[13rem] rounded-2xl bg-surface p-1.5 shadow-lift ring-1 ring-rose-soft">
                      {n.children.map((c) => (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            onClick={() => setMenu(null)}
                            className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                              isActive(c.href) ? "bg-rose text-accentink" : "text-plum/70 hover:bg-blush hover:text-plum"
                            }`}
                          >
                            {t(c.key)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ) : (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    isActive(n.href) ? "bg-rose text-accentink" : "text-plum/60 hover:bg-blush hover:text-plum"
                  }`}
                >
                  {t(n.key)}
                </Link>
              </li>
            )
          )}
          <li className="ml-1"><NotificationBell /></li>
          <li>{profileButton}</li>
          <li>{themeButton}</li>
          <li>{langButton("")}</li>
        </ul>

        {/* mobile: notifications + profile + theme + language toggle + menu button */}
        <div className="flex items-center gap-2 md:hidden">
          <NotificationBell />
          {profileButton}
          {themeButton}
          {langButton("")}
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-full bg-blush p-2 text-plum ring-1 ring-rose-soft"
            aria-label={t("nav.menu")}
            aria-expanded={open}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      <div className="border-t border-rose-soft/40 px-5 py-1.5 text-center">
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-sage-soft/80 px-3 py-1 text-[11px] font-semibold text-sage-deep ring-1 ring-sage-deep/10"
          title={t("privacy.badge")}
          aria-label={t("privacy.badge")}
        >
          <Icon name="lock" size={12} />
          Privacy First / No Sign-up Required
        </span>
      </div>

      {/* mobile menu — all pages flattened (dropdowns expanded) */}
      {open && (
        <ul className="grid grid-cols-2 gap-1.5 px-5 pb-4 md:hidden">
          {NAV_LINKS.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  isActive(n.href)
                    ? "bg-rose text-accentink"
                    : "bg-surface/70 text-plum/70 ring-1 ring-rose-soft"
                }`}
              >
                {t(n.key)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
