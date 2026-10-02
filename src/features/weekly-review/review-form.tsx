"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveReview } from "@/lib/client-api";
import type { WeeklyReflection } from "@/types/learning";

export function ReviewForm({ weekStart, initial }: { weekStart: string; initial?: WeeklyReflection }) {
  const router = useRouter();
  const [learned, setLearned] = useState<[string, string, string]>([
    initial?.learned?.[0] || "",
    initial?.learned?.[1] || "",
    initial?.learned?.[2] || "",
  ]);
  const [tryNext, setTryNext] = useState(initial?.tryNext || "");
  const [teach, setTeach] = useState(initial?.teach || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="space-y-3 rounded-2xl border border-line bg-elev p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setSaved(false);
        try {
          await saveReview({ weekStart, learned, tryNext, teach, notes });
          setSaved(true);
          router.refresh();
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Could not save.");
        }
      }}
    >
      <h2 className="font-serif text-2xl">3 learned, 1 try, 1 teach</h2>
      {learned.map((value, index) => (
        <label key={index} className="block text-sm">
          Learned {index + 1}
          <input
            className="field mt-1"
            value={value}
            onChange={(event) => {
              const next = [...learned] as [string, string, string];
              next[index] = event.target.value;
              setLearned(next);
            }}
          />
        </label>
      ))}
      <label className="block text-sm">
        One thing to try
        <input className="field mt-1" value={tryNext} onChange={(event) => setTryNext(event.target.value)} />
      </label>
      <label className="block text-sm">
        One thing to teach or share
        <input className="field mt-1" value={teach} onChange={(event) => setTeach(event.target.value)} />
      </label>
      <label className="block text-sm">
        Notes
        <textarea className="field mt-1" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm text-accent-ink">
        Save reflection
      </button>
      {saved ? <p className="text-sm text-ok">Saved for this week on this machine.</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </form>
  );
}
