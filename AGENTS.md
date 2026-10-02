<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent guide

Read `README.md` before changing behaviour. The plan lives in Notion. Source control holds the app.

## Do

- Read `src/lib/notion` before changing how items are stored.
- Read agenda sessions and tasks from their related databases. The learning item stays the parent.
- Extend `LearningItem` and `LearningItemInput` before adding a field to the UI.
- Map new Notion properties in `schema.ts` and `mapper.ts`, then thread them through `toInput()` and `validateInput()`.
- Keep Source, Type, and Track separate. Source is where it came from. Type is what it is. Track is the subject.
- Merge partial updates with the current item so a notes save does not clear other fields.
- Keep the Notes marker (`<!-- myailearning:... -->`) intact.
- Put new filters and shelves in the URL via `src/lib/filters.ts`.
- Add a case to `scripts/verify-domain.ts` when mapper, focus, or pace behaviour changes.
- Run `npm run typecheck` and `npm run verify` after domain edits.
- Exercise a changed screen in the browser, including a second page that reads the same item.
- Archive items. Trashing a Notion page is the delete path.

## Don't

- Do not put names, courses, events, tickets, venues, costs, or work commitments in source, README, or tests.
- Do not commit `.env.local`, tokens, database ids, or `*.pem`.
- Do not import `@/lib/notion/client` or `@/lib/repository` from a client component.
- Do not add a second Notion database for the same items.
- Do not create Notion rows from email. Gmail may only propose an `EventCandidate` after a person approves it.
- Do not special-case one Notion page id.
- Do not show a personal demo seed when Notion is missing or failing. Show an empty tracker.
- Do not hardcode a calendar month or a protected event. Timeline months come from dated rows.
- Do not disable TLS verification. If Node rejects the local proxy certificate, use the extra CA file already loaded by `src/lib/notion/client.ts`.
- Do not rewrite git history or force-push `main` unless the user asks.
