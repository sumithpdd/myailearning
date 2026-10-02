import Link from "next/link";
import { cn } from "@/lib/cn";

const TONES: Record<string, string> = {
  neutral: "border-line bg-canvas text-muted",
  core: "border-transparent bg-danger/10 text-danger",
  high: "border-transparent bg-warn/15 text-warn",
  medium: "border-line bg-elev text-ink",
  optional: "border-line bg-canvas text-muted",
  going: "border-transparent bg-ok/15 text-ok",
  progress: "border-transparent bg-accent/15 text-accent",
  done: "border-transparent bg-ok/10 text-ok",
  skipped: "border-line bg-canvas text-muted line-through",
  warn: "border-transparent bg-warn/15 text-warn",
  danger: "border-transparent bg-danger/10 text-danger",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", TONES[tone] || TONES.neutral)}>
      {children}
    </span>
  );
}

export function statusTone(status: string): string {
  if (status === "Going" || status === "Confirmed") return "going";
  if (status === "In Progress") return "progress";
  if (status === "Completed" || status === "Attended") return "done";
  if (status === "Skipped") return "skipped";
  return "neutral";
}

export function priorityTone(priority: string): string {
  return priority.toLowerCase();
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function ModeBanner({ mode, warning }: { mode: "demo" | "notion"; warning?: string }) {
  if (warning) {
    return <div className="mb-4 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">{warning}</div>;
  }
  if (mode === "demo") {
    return (
      <div className="mb-4 rounded-xl border border-brass/40 bg-brass/10 px-4 py-3 text-sm">
        <strong className="font-semibold">Demo mode.</strong> Add <code>NOTION_TOKEN</code> and <code>NOTION_DATABASE_ID</code> to{" "}
        <code>.env.local</code> to use Events &amp; Learning Tracker.{" "}
        <Link href="/settings" className="underline">
          Settings
        </Link>
      </div>
    );
  }
  return null;
}

export function PageFrame({
  eyebrow,
  title,
  lede,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brass">{eyebrow}</p> : null}
          <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h1>
          {lede ? <p className="mt-2 text-sm leading-6 text-muted sm:text-base">{lede}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-elev px-5 py-10 text-center">
      <p className="font-serif text-xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
    </div>
  );
}
