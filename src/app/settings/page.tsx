import { SchemaEditor, type ChoiceProperty } from "@/components/settings/schema-editor";
import { PageFrame } from "@/components/ui";
import { getNotionContext, notionConfigured } from "@/lib/notion/client";
import { choiceProperties } from "@/lib/notion/schema";
import { listItems } from "@/lib/repository";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const configured = notionConfigured();
  const collection = await listItems();
  let notionTitle: string | undefined;
  let version: string | undefined;
  let properties: string[] = [];
  let choices: ChoiceProperty[] = [];
  let notionError: string | undefined;
  if (configured && collection.mode === "notion") {
    try {
      const context = await getNotionContext(true);
      notionTitle = context.databaseTitle;
      version = context.version;
      properties = context.schema.properties.map((property) => `${property.name} (${property.type})`);
      choices = choiceProperties(context.schema).map((property) => ({
        name: property.name,
        type: property.type as ChoiceProperty["type"],
        options: property.options || [],
      }));
    } catch (error) {
      notionError = error instanceof Error ? error.message : "Could not read the Notion schema.";
    }
  }

  return (
    <PageFrame title="Settings" lede="Status, tags, and the other choice lists are stored in Notion. The browser never receives the integration token.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-elev p-4 text-sm leading-6">
          <h2 className="font-serif text-2xl">Connection</h2>
          <p className="mt-2">
            Mode: <strong>{collection.readOnly ? "Read only" : collection.mode === "notion" ? "Live Notion" : "Not connected"}</strong>
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
          <p className="mt-3">Share the database with the integration. Do not commit .env.local.</p>
        </section>
        <section className="rounded-2xl border border-line bg-elev p-4 text-sm leading-6">
          <h2 className="font-serif text-2xl">What the adapter stores</h2>
          <p className="mt-2">
            Progress, evidence, cost, session marks, and checklists are saved in a hidden note marker when the database has no matching property. Confirmed is stored as Going plus that marker when the status list has no Confirmed option.
          </p>
          <p className="mt-2">Deleting an item archives it. Notion pages are trashed rather than destroyed.</p>
          {properties.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs">
              {properties.map((property) => (
                <li key={property}>{property}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-muted">Property names appear here once Notion responds.</p>
          )}
        </section>
      </div>
      <section className="mt-6">
        <h2 className="font-serif text-2xl">Choice lists</h2>
        <div className="mt-3">
          <SchemaEditor properties={choices} readOnly={collection.readOnly} />
        </div>
      </section>
    </PageFrame>
  );
}
