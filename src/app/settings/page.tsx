import { PageFrame } from "@/components/ui";
import { TRACKS } from "@/lib/constants";
import { credentialsConfigured, listItems } from "@/lib/repository";
import { getNotionContext } from "@/lib/notion/client";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const configured = credentialsConfigured();
  const collection = await listItems();
  let notionTitle: string | undefined;
  let version: string | undefined;
  let properties: string[] = [];
  let notionError: string | undefined;
  if (configured && collection.mode === "notion") {
    try {
      const context = await getNotionContext();
      notionTitle = context.databaseTitle;
      version = context.version;
      properties = context.schema.properties.map((property) => `${property.name} (${property.type})`);
    } catch (error) {
      notionError = error instanceof Error ? error.message : "Could not read the Notion schema.";
    }
  }

  return (
    <PageFrame title="Settings" lede="Notion stays on the server. The browser never receives the integration token.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-elev p-4 text-sm leading-6">
          <h2 className="font-serif text-2xl">Connection</h2>
          <p className="mt-2">
            Mode: <strong>{collection.readOnly ? "Demo fallback" : collection.mode === "notion" ? "Live Notion" : "Demo mode"}</strong>
          </p>
          <p>{collection.items.length} items loaded.</p>
          {collection.warning ? <p className="mt-2 text-warn">{collection.warning}</p> : null}
          {notionError ? <p className="mt-2 text-danger">{notionError}</p> : null}
          {notionTitle ? (
            <p className="mt-2">
              Database: {notionTitle}. API version {version}.
            </p>
          ) : null}
          <h3 className="mt-4 font-medium">.env.local</h3>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-canvas p-3 text-xs">{`NOTION_TOKEN=
NOTION_DATABASE_ID=
NOTION_DATA_SOURCE_ID=
NOTION_VERSION=2025-09-03
NEXT_PUBLIC_APP_NAME=MyAILearning`}</pre>
          <p className="mt-3">Share Events &amp; Learning Tracker with the integration. Do not commit .env.local.</p>
        </section>
        <section className="rounded-2xl border border-line bg-elev p-4 text-sm leading-6">
          <h2 className="font-serif text-2xl">What the adapter stores</h2>
          <p className="mt-2">
            Progress, evidence, cost, session marks, and checklists are saved in a hidden note marker when the database has no matching property. Confirmed is stored as Going plus that marker, because the select has no Confirmed option. Conference, Webinar, and Learning map to the nearest existing type the same way.
          </p>
          <p className="mt-2">Deleting an item archives it. Notion pages are trashed rather than destroyed.</p>
          {properties.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs">
              {properties.map((property) => (
                <li key={property}>{property}</li>
              ))}
            </ul>
          ) : (
            <ul className="mt-3 space-y-1">
              {TRACKS.map((track) => (
                <li key={track.id}>
                  {track.label} ← {track.aliases.join(", ")}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PageFrame>
  );
}
