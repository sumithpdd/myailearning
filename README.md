# MyAILearning

Personal operating system for Sumith’s 2026 AI learning plan. It answers one question: **what should I learn next to become materially better at AI by 15 December 2026?**

The app is a dashboard over the existing Notion database **Events & Learning Tracker** in the **Sumith 2026** workspace. It does not create a second database.

## Purpose

Keep AI learning, events, deadlines, notes, and evidence in one place, and make it obvious whether the plan is on track for **15 December 2026**.

The loop is **Discover → Decide → Learn → Apply → Evidence → Review**. A finished course with nothing to show is worth less than a smaller piece of applied work.

## Product goals

- Show days remaining and whether core progress matches the calendar.
- Surface a short focus list and an explicit “defer” list. Depth beats collection.
- Read events, notes, and deadlines from the Notion tracker. Do not copy that plan into source.
- Read and write the Notion tracker without exposing the integration token to the browser.
- Stay usable in **Demo mode** when credentials are missing.

## Current learning strategy

The plan lives in the Notion tracker. The app does not keep course names, events, tickets, or work commitments in source.

Target load outside events: **4–6 focused hours a week**. A multi-day event replaces study blocks. Priority order is Core, then High, then Medium, then Optional.

What “done” means lives on the tracker rows: notes, evidence, and status. The app does not keep a separate outcome list.

## Technology stack

- Next.js 16 (App Router) and React 19
- TypeScript
- Tailwind CSS 4
- Notion REST API from server-only route handlers (no Notion SDK, so the version fallback stays explicit)
- Demo persistence in `.data/` when Notion is not configured

The npm package name is `myailearning` because npm rejects capital letters. The folder name is `MyAILearning`.

## Architecture

```text
Notion API
    ↓
src/lib/notion   adapter (client, schema, mapper, queries, mutations)
    ↓
LearningItem     src/types/learning.ts
    ↓
src/lib          progress, focus, filters, weekly report
    ↓
src/app          pages and /api route handlers
```

React components never see raw Notion property objects.

If `NOTION_TOKEN` or `NOTION_DATABASE_ID` is missing, or the Notion request fails, the app shows an empty tracker and does not substitute a personal seed. Writes go only to Notion.

App-only fields (progress, evidence, cost, checklist, session marks, activity) are stored in a single HTML comment at the end of the Notes property:

```text
<!-- myailearning:URL_ENCODED_JSON -->
```

The visible note is everything before that marker. This avoids adding properties to the shared database. If you edit Notes inside Notion and delete the marker, progress falls back to a status estimate.

`Confirmed` is not a Status option in Notion. The adapter writes **Going** and keeps `Confirmed` in the marker. `Conference`, `Webinar`, and `Learning` are mapped onto the nearest existing Type the same way.

Track names are normalised:

| In the app | In Notion today |
| --- | --- |
| AI Discovery | SEO-AEO-GEO |
| Data / ML | Data-ML |
| Community / Teaching | Community |
| Cloud | Cloud |

Unknown properties are ignored. Missing optional properties do not throw.

## Folder structure

```text
src/app/                  routes, including /api
src/components/           shell, cards, filters, forms
src/features/dashboard/   landing dashboard
src/app/going/            current Going event, read from the tracker
src/features/weekly-review/
src/lib/notion/           Notion adapter
src/lib/demo/             seed data and local JSON store
src/lib/                  dates, progress, focus, filters, repository
src/types/learning.ts     domain model
scripts/verify-domain.ts  domain checks (no browser, no network)
```

Future seams, not implemented:

- Gmail → event candidate → you approve → `createItem`. Never auto-insert marketing mail.
- Outlook busy intervals passed into `weekLoads` / `assessPace`. Until then, work commitments are ordinary tracker rows.

`EventCandidate` in `src/types/learning.ts` is the Gmail-shaped type to build against.

## Running locally

```powershell
cd C:\code\react\MyAILearning
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Other commands:

```powershell
npm run typecheck
npm run lint
npm run verify
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

```env
NOTION_TOKEN=
NOTION_DATABASE_ID=
NOTION_DATA_SOURCE_ID=
NOTION_VERSION=2025-09-03
NEXT_PUBLIC_APP_NAME=MyAILearning
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `NOTION_TOKEN` | For live data | Internal integration secret. Server only. |
| `NOTION_DATABASE_ID` | For live data | Events & Learning Tracker. |
| `NOTION_DATA_SOURCE_ID` | No | Filled in automatically from the database when possible. |
| `NOTION_VERSION` | No | Sent to the API. The client tries `2025-09-03`, then `2022-06-28`. |
| `NEXT_PUBLIC_APP_NAME` | No | Display name. The token is not public. |

The database id for the current tracker is:

```text
07ca163e-4c8f-4d17-be42-fe550ef5b178
```

The data source id, if you want to set it explicitly:

```text
2b28f5c6-17ed-465a-9402-d5a19e66a082
```

## Connecting Notion

1. Open https://www.notion.so/my-integrations and create an internal integration.
2. Copy the secret into `NOTION_TOKEN`.
3. In Notion, open **Events & Learning Tracker** (under Sumith 2026) and use the **Connections** menu to share it with that integration. Sharing only the parent page is not always enough; the database itself must be connected.
4. Put the database id above into `NOTION_DATABASE_ID`.
5. Restart `npm run dev`.
6. Settings should say **Live Notion**. The banner on the dashboard disappears.

Create, edit, status, progress, notes, next action, links, tracks, evidence, and archive all go through `/api/items`. Archive moves the Notion page to trash. It does not hard-delete.

## Notion database schema

Observed on 1 October 2026. The adapter does not require this exact set.

| Property | API type | Notes |
| --- | --- | --- |
| Name | title | Required |
| Type | select | Event, Workshop, Course, Book, liveProject |
| Status | select | Considering, To Do, Going, In Progress, Attended, Completed, Skipped |
| Priority | select | Core, High, Medium, Optional |
| Track | multi-select | AI Engineering, Agents, SEO-AEO-GEO, Cloud, Product, Data-ML, Community |
| Provider, Location, Notes, Next Action, Offer | rich text | |
| Date, Deadline | date | Date may be a range |
| Link, Email | url | |

There is no Progress, Cost, or Evidence column. Those ride in the Notes marker described above.

## CRUD architecture

| Action | Demo mode | Notion mode |
| --- | --- | --- |
| Read | `.data/demo-store.json`, or the seed if that file is absent | Query the data source, map every page |
| Create | Prepend a `demo-` id | `POST /v1/pages` |
| Update | Rewrite the JSON file | `PATCH /v1/pages/{id}` |
| Delete | `archived: true` | Trash the page (`in_trash`, with `archived` as fallback) |

Partial updates from the detail page are merged with the current item before validation, so changing status does not wipe notes.

## Demo mode

If Notion credentials are missing or the request fails, the app shows an empty tracker and does not substitute a personal seed. A tiny anonymous fixture remains for `npm run verify` only.

## Learning prioritisation rules

- Core > High > Medium > Optional.
- Focus shows a handful of items, not every Core row at once.
- Optional and Medium items that collide with a Going event, or that sit in a heavy week, are listed under **Suggested to defer**.
- A week is **Heavy** when it has two or more events, a multi-day event, or a Core deadline beside several High items.
- Skipped items stay out of the focus list. Their names and reasons live on the tracker row.

## 15 December target

`PLAN_START` is 1 September 2026. `FINISH_LINE` is 15 December 2026.

Core progress is a priority-weighted average (Core 3, High 2, Medium 1, Optional 0.5). Skipped items are excluded. Status implies a progress estimate until you set a number: Completed/Attended 100, In Progress 40, Going/Confirmed 20, otherwise 0.

The pace line compares core progress with how much of the plan window has elapsed. It also compares remaining Core and High study hours with about five hours a week, reduced to two hours in weeks that already contain an event.

## Development conventions

- Keep Notion access in `src/lib/notion`. Do not import `@/lib/notion/client` from a client component.
- Extend `LearningItem` before adding fields to components.
- Preserve the Notes marker when changing how notes are saved.
- Prefer archiving to hard deletion.
- New filters should round-trip through the URL.
- Do not add a second Notion database for the same items.
- Run `npm run typecheck`, `npm run lint`, `npm run verify`, and `npm run build` before calling the app done.

## Known limitations

- Weekly reflections are local (`.data/weekly-reviews.json`), not Notion pages.
- Progress and evidence disappear from the app’s point of view if the marker is deleted in Notion.
- Work commitments are tracker rows. There is no separate hardcoded calendar.
- Gmail is not connected. Do not auto-create rows from email.
- “Active learning” counts In Progress, Going, and Confirmed. Past events still marked Going are called out so they can be marked Attended.
- The Notion query loads the whole database. That is appropriate for this tracker and will not scale to tens of thousands of rows.
- Demo ids are slugs. Notion ids are page ids. Switching modes does not merge the two stores.
- Dark mode is stored in `localStorage` under `theme`.

## Future roadmap

- Gmail candidate inbox with an explicit approve step.
- Outlook busy times as tracker rows or as input to `weekLoads`.
- A real weekly planner that assigns the 4–6 hours to specific Core items.
- Optional Notion properties for Progress and Evidence if the database grows them later. The mapper already writes those properties when they exist.
- Richer calendar drag-and-drop. The current timeline is a three-month grid plus a chronological list.

## Cursor continuation guide

Read this file and `src/lib/notion` before changing behaviour.

### Add feature

Read README.md and the architecture before making changes. Add a calendar view for all Going and Confirmed events. Preserve the Notion adapter architecture.

### Add Gmail

Add an optional server-side Gmail integration that discovers AI-learning/event emails but never automatically adds them to Notion without confirmation.

### Weekly planning

Create a weekly recommendation engine using priority, deadlines, events and 4–6 available learning hours.

### Fix a Notion write

Read `src/lib/notion/mapper.ts` and `schema.ts`. Do not special-case a single page id. If a select option is missing, keep the fallback and the marker. Add a case to `scripts/verify-domain.ts`.
