# MyAILearning

A learning tracker UI over one Notion database. The plan lives in Notion. This repository holds the app, not the plan.

## Architecture

```text
Browser
  pages and client components
    ↓  fetch /api
Route handlers          src/app/api
    ↓
Repository              src/lib/repository.ts
    ↓
Notion adapter          src/lib/notion
    ↓
Notion REST API
```

React never sees raw Notion property objects. Pages call `listItems`, `getItem`, `createItem`, `updateItem`, and `archiveItem`. Those functions return `LearningItem` from `src/types/learning.ts`.

```text
Notion page
  → mapNotionPage()        src/lib/notion/mapper.ts
  → LearningItem
  → focus, pace, filters   src/lib
  → pages                  src/app
```

Writes go the other way: validate `LearningItemInput`, merge it with the current item, then `toNotionProperties()`.

If `NOTION_TOKEN` or `NOTION_DATABASE_ID` is missing, or Notion fails, the UI shows an empty tracker. It does not substitute a personal seed. Writes are refused until Notion responds.

### Notion adapter

| File | Job |
| --- | --- |
| `client.ts` | HTTPS, version fallback, schema cache |
| `schema.ts` | Property names and aliases |
| `mapper.ts` | Page ↔ `LearningItem` |
| `queries.ts` | List and retrieve |
| `mutations.ts` | Create, update, archive |

The client tries Notion-Version `2025-09-03`, then `2022-06-28`. Unknown properties are ignored. A missing optional property does not throw.

App-only fields (progress, evidence, cost, checklist, session marks, activity) ride in one HTML comment at the end of Notes:

```text
<!-- myailearning:URL_ENCODED_JSON -->
```

The visible note is everything before that marker. Deleting the marker in Notion makes progress fall back to a status estimate.

`Confirmed` is not a Status option. The adapter writes **Going** and keeps `Confirmed` in the marker.

### Classification

Three different fields. Do not fold them into one.

| Field | Question | Notion property |
| --- | --- | --- |
| Source | Where did it come from? | `Source` select |
| Type | What kind of item is it? | `Type` select |
| Track | What subject is it? | `Track` multi-select |
| Horizon | When does it belong? | `Horizon` select |

An empty Horizon is suggested from status, dates, and priority. A stored Horizon is left as written. `/roadmap` groups rows by horizon and lists what is slipping, with the blocker or the inferred reason.

Provider stays free text for a more specific name. Source is the short flag.

### Pace

`src/lib/constants.ts` holds `PLAN_START`, `FINISH_LINE`, and the weekly hour numbers. Pages format those constants. Do not copy the dates into prose, README, or a second constant.

Core progress is a priority-weighted average. Skipped items are excluded. Until a row has a progress number, status supplies an estimate.

## Folder map

```text
src/app/                  routes and /api handlers
src/components/           shell, cards, forms, detail
src/features/             dashboard and weekly review UI
src/lib/notion/           Notion adapter
src/lib/                  dates, progress, focus, filters, repository
src/types/learning.ts     domain model
src/lib/demo/data.ts      anonymous fixture for npm run verify
scripts/verify-domain.ts  domain checks, no browser, no network
```

## Coding patterns

**Add a field**

1. Add it to `LearningItem` and `LearningItemInput`.
2. Map it in `mapper.ts` and alias it in `schema.ts`.
3. Pass it through `toInput()` in `repository.ts` and `validateInput()`.
4. Show it in the form and the detail view.
5. Add a case in `scripts/verify-domain.ts`.

A partial save merges the patch onto the current item before validation. A notes-only save must not wipe Source, dates, or tracks. If a new property is omitted from `toInput()`, the next save clears it.

**Add a filter or shelf**

Parse it in `src/lib/filters.ts` and write it back to the query string. Shelves are `active`, `books`, `videos`, `events`, and `completed`.

**Add a page**

Server page loads through the repository. Client components receive plain data. They do not import `@/lib/notion/client` or `@/lib/repository`.

**Select options**

Keep option lists in `src/types/learning.ts`. Write with `optionOrFallback`. If Notion lacks an option, store the app value in the Notes marker instead of inventing a property.

## Skills

Use these when changing the app:

| Skill | Do this |
| --- | --- |
| Read before edit | Open `AGENTS.md`, this file, and `src/lib/notion` before changing behaviour. |
| Stay on the domain type | Change `LearningItem` first. Components follow the type. |
| Keep secrets local | Tokens and database ids live in `.env.local` and in the host's env settings. |
| Prove domain changes | `npm run verify` after mapper, focus, pace, or filter changes. |
| Prove the UI | Exercise the changed page: click, filter, save, and check a second page that reads the same item. |
| Match this Next.js | Read `node_modules/next/dist/docs/` before using a Next API. This version differs from older training data. |

## Running locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000.

```powershell
npm run typecheck
npm run lint
npm run verify
npm run build
```

## Environment

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NOTION_TOKEN` | For live data | Internal integration secret. Server only. |
| `NOTION_DATABASE_ID` | For live data | Database id from the Notion URL. |
| `NOTION_DATA_SOURCE_ID` | No | Discovered from the database when omitted. |
| `NOTION_VERSION` | No | Tried first. The client falls back if needed. |
| `NEXT_PUBLIC_APP_NAME` | No | Display name. |

Share the database itself with the integration. Sharing only a parent page is not always enough. Restart `npm run dev` after changing env vars.

## Routes

| Path | Role |
| --- | --- |
| `/` | Pace, focus, and the next Going item |
| `/learning` | Catalogue, shelves, source, type, and track |
| `/events` | Event and workshop rows |
| `/going` | Current Going or Confirmed items, plus rows on the same dates |
| `/focus` | Short list and deferrals |
| `/timeline` | Months that contain dated rows |
| `/path` | Core and optional rows from the tracker |
| `/weekly-review` | Local reflection for one week |
| `/settings` | Connection status |

`/api/items` creates and updates. Archive trashes the Notion page. It does not hard-delete.

## CRUD

| Action | Notion |
| --- | --- |
| Read | Query the data source and map every page |
| Create | `POST /v1/pages` |
| Update | `PATCH /v1/pages/{id}` |
| Delete | Trash the page (`in_trash`, then `archived`) |

There is no second database. Weekly reflections stay in `.data/weekly-reviews.json` on the machine that wrote them.

## Limits

- The query loads the whole database.
- Gmail must not create rows. `EventCandidate` is only a type.
- Work time belongs on tracker rows, not in a hardcoded calendar.
- Dark mode is `localStorage` key `theme`.
