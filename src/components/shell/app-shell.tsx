"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { APP_NAME, FINISH_LINE } from "@/lib/constants";
import { formatDisplayDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { NotionConnection } from "@/types/learning";

const NAV = [
  { href: "/", label: "Today" },
  { href: "/week", label: "This Week" },
  { href: "/career", label: "Career" },
  { href: "/learning", label: "Learning" },
  { href: "/focus", label: "Focus" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/events", label: "Events" },
  { href: "/timeline", label: "Timeline" },
  { href: "/going", label: "Going" },
  { href: "/weekly-review", label: "Weekly Review" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children, connection }: { children: React.ReactNode; connection: NotionConnection }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-full md:pl-60">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/" className="font-serif text-lg">
          {APP_NAME}
        </Link>
        <button type="button" className="rounded-full border border-line px-3 py-1.5 text-sm" onClick={() => setOpen(true)}>
          Menu
        </button>
      </header>
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar text-sidebar-ink transition-transform md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="px-5 pb-4 pt-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-sidebar-muted">AI career</p>
          <Link href="/" className="mt-1 block font-serif text-2xl" onClick={() => setOpen(false)}>
            {APP_NAME}
          </Link>
          <p className="mt-1 text-xs text-sidebar-muted">Finish line {formatDisplayDate(FINISH_LINE)}</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm",
                  active ? "bg-white/10 text-white" : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3 p-4">
          <ConnectionStatus connection={connection} />
          <ThemeToggle />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ConnectionStatus({ connection }: { connection: NotionConnection }) {
  const dot = connection.status === "live" ? "bg-emerald-400" : connection.status === "offline" ? "bg-amber-400" : "bg-white/30";
  return (
    <p className="flex items-start gap-2 text-xs text-sidebar-muted" title={connection.detail}>
      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", dot)} />
      <span>
        {connection.label}
        {connection.detail ? <span className="mt-0.5 block text-[11px] leading-4 text-sidebar-muted/80">{connection.detail}</span> : null}
      </span>
    </p>
  );
}

function ThemeToggle() {
  return (
    <button
      type="button"
      className="w-full rounded-full border border-white/15 px-3 py-2 text-left text-sm text-sidebar-muted hover:text-sidebar-ink"
      onClick={() => {
        const isDark = document.documentElement.classList.toggle("dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
      }}
    >
      Toggle dark mode
    </button>
  );
}
