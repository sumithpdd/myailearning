import Link from "next/link";
import { ModeBanner } from "@/components/ui";
import { formatDisplayDate } from "@/lib/dates";
import { recentNotes } from "@/lib/execute";
import { listWork } from "@/lib/repository";

export const metadata = { title: "Notes" };

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ kind?: string; id?: string }> }) {
  const params = await searchParams;
  const work = await listWork();
  const notes = recentNotes(work.items, work.tasks, work.agenda, 80);
  const selected = notes.find((note) => note.kind === params.kind && note.id === params.id) || null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
      <ModeBanner mode={work.mode} warning={work.warning} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <p className="mt-2 text-sm text-muted">Notes live on the learning item, task, or session they came from.</p>
      </header>
      {selected ? (
        <article className="mt-6 border-y border-line py-4">
          <p className="text-sm text-muted">
            {selected.parentName}
            {selected.date ? ` · ${formatDisplayDate(selected.date)}` : ""}
          </p>
          <h2 className="mt-1 text-xl font-semibold">{selected.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{selected.body}</p>
          <Link href="/notes" className="mt-4 inline-block text-sm text-accent">
            All notes
          </Link>
        </article>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {notes.length === 0 ? <li className="py-3 text-sm text-muted">No notes yet. Add one with + while you are learning.</li> : null}
          {notes.map((note) => (
            <li key={`${note.kind}-${note.id}`} className="py-3">
              <Link href={note.href} className="font-medium hover:text-accent">
                {note.title}
              </Link>
              <p className="text-sm text-muted">
                {note.parentName}
                {note.date ? ` · ${formatDisplayDate(note.date)}` : ""}
              </p>
              <p className="mt-1 text-sm leading-6">{note.preview}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
