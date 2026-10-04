import { existsSync, readFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import tls from "node:tls";
import { parseSchema, type NotionSchema, type SchemaOption } from "@/lib/notion/schema";

const NOTION_ORIGIN = "https://api.notion.com/v1";

/**
 * This machine intercepts HTTPS with a Sitecore root that Windows trusts and Node does not.
 * The public certificate is gitignored. Without it, fetch fails with SELF_SIGNED_CERT_IN_CHAIN.
 */
const EXTRA_CA_PATH = path.join(process.cwd(), "certs", "sitecore-class1-root.pem");

export class NotionRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type NotionContext = {
  version: "2025-09-03" | "2022-06-28";
  databaseId: string;
  dataSourceId?: string;
  schema: NotionSchema;
  databaseTitle?: string;
};

type FetchInit = {
  method?: string;
  body?: unknown;
  version: string;
};

let cached: { at: number; context: NotionContext } | null = null;

export function notionConfigured(): boolean {
  return Boolean(process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID);
}

export function clearNotionCache(): void {
  cached = null;
}

async function notionFetch<T>(requestPath: string, init: FetchInit): Promise<T> {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw new NotionRequestError(401, "NOTION_TOKEN is not set.");
  const body = init.body === undefined ? undefined : JSON.stringify(init.body);
  let status: number;
  let text: string;
  try {
    const response = await requestNotion(`${NOTION_ORIGIN}${requestPath}`, init.method || "GET", {
      Authorization: `Bearer ${token}`,
      "Notion-Version": init.version,
      "Content-Type": "application/json",
    }, body);
    status = response.status;
    text = response.text;
  } catch (error) {
    throw new NotionRequestError(503, networkMessage(error));
  }
  const payload = text ? safeJson(text) : {};
  if (status < 200 || status >= 300) {
    const message = typeof payload.message === "string" ? payload.message : `Notion request failed (${status}).`;
    throw new NotionRequestError(status, message.slice(0, 400));
  }
  return payload as T;
}

function requestNotion(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; text: string }> {
  const ca = trustedCertificates();
  if (!ca) {
    return fetch(url, { method, headers, body, cache: "no-store" }).then(async (response) => ({
      status: response.status,
      text: await response.text(),
    }));
  }
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers, ca }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer | string) => {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      });
      res.on("end", () => {
        resolve({ status: res.statusCode || 0, text: Buffer.concat(chunks).toString("utf8") });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function trustedCertificates(): string[] | undefined {
  if (!existsSync(EXTRA_CA_PATH)) return undefined;
  return [...tls.rootCertificates, readFileSync(EXTRA_CA_PATH, "utf8")];
}

function networkMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause;
    const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
    return `Could not reach Notion (${code || error.message}).`;
  }
  return "Could not reach Notion.";
}

function safeJson(text: string): { message?: string; [key: string]: unknown } {
  try {
    return JSON.parse(text) as { message?: string };
  } catch {
    return { message: text.slice(0, 200) };
  }
}

export async function getNotionContext(force = false): Promise<NotionContext> {
  if (!force && cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.context;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) throw new NotionRequestError(400, "NOTION_DATABASE_ID is not set.");

  try {
    const database = await notionFetch<NotionDatabase>(`/databases/${databaseId}`, { version: "2025-09-03" });
    const dataSourceId = process.env.NOTION_DATA_SOURCE_ID || database.data_sources?.[0]?.id;
    if (dataSourceId) {
      const dataSource = await notionFetch<NotionDatabase>(`/data_sources/${dataSourceId}`, { version: "2025-09-03" });
      const context: NotionContext = {
        version: "2025-09-03",
        databaseId,
        dataSourceId,
        schema: parseSchema(dataSource.properties || database.properties),
        databaseTitle: readTitle(dataSource.title) || readTitle(database.title),
      };
      cached = { at: Date.now(), context };
      return context;
    }
  } catch (error) {
    if (!(error instanceof NotionRequestError)) throw error;
  }

  const database = await notionFetch<NotionDatabase>(`/databases/${databaseId}`, { version: "2022-06-28" });
  const context: NotionContext = {
    version: "2022-06-28",
    databaseId,
    schema: parseSchema(database.properties),
    databaseTitle: readTitle(database.title),
  };
  cached = { at: Date.now(), context };
  return context;
}

export type OpenedDatabase = {
  databaseId: string;
  dataSourceId?: string;
  title?: string;
  schema: NotionSchema;
  version: "2025-09-03" | "2022-06-28";
};

export async function openDatabase(databaseId: string, dataSourceId?: string): Promise<OpenedDatabase> {
  try {
    const database = await notionFetch<NotionDatabase>(`/databases/${databaseId}`, { version: "2025-09-03" });
    const sourceId = dataSourceId || database.data_sources?.[0]?.id;
    if (sourceId) {
      const dataSource = await notionFetch<NotionDatabase>(`/data_sources/${sourceId}`, { version: "2025-09-03" });
      return {
        databaseId,
        dataSourceId: sourceId,
        title: readTitle(dataSource.title) || readTitle(database.title),
        schema: parseSchema(dataSource.properties || database.properties),
        version: "2025-09-03",
      };
    }
  } catch (error) {
    if (!(error instanceof NotionRequestError)) throw error;
  }
  const database = await notionFetch<NotionDatabase>(`/databases/${databaseId}`, { version: "2022-06-28" });
  return {
    databaseId,
    title: readTitle(database.title),
    schema: parseSchema(database.properties),
    version: "2022-06-28",
  };
}

export async function openDataSource(dataSourceId: string): Promise<OpenedDatabase> {
  const dataSource = await notionFetch<NotionDatabase>(`/data_sources/${dataSourceId}`, { version: "2025-09-03" });
  return {
    databaseId: dataSourceId,
    dataSourceId,
    title: readTitle(dataSource.title),
    schema: parseSchema(dataSource.properties),
    version: "2025-09-03",
  };
}

export type DatabaseSearchHit = {
  id: string;
  title: string;
  object?: string;
  databaseId?: string;
};

export async function searchDatabases(query: string): Promise<DatabaseSearchHit[]> {
  const attempts = [
    { version: "2025-09-03" as const, value: "data_source" },
    { version: "2022-06-28" as const, value: "database" },
  ];
  const hits = new Map<string, DatabaseSearchHit>();
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const result = await notionFetch<{ results?: SearchEntry[] }>("/search", {
        method: "POST",
        version: attempt.version,
        body: { query, filter: { property: "object", value: attempt.value }, page_size: 20 },
      });
      for (const entry of result.results || []) {
        if (!entry.id || hits.has(entry.id)) continue;
        hits.set(entry.id, {
          id: entry.id,
          title: readTitle(entry.title) || entry.name || "",
          object: entry.object,
          databaseId: entry.parent?.type === "database_id" ? entry.parent.database_id : undefined,
        });
      }
    } catch (error) {
      lastError = error;
      if (!(error instanceof NotionRequestError)) throw error;
    }
  }
  if (hits.size === 0 && lastError instanceof NotionRequestError && lastError.status >= 500) throw lastError;
  return [...hits.values()];
}

export async function openSearchHit(hit: DatabaseSearchHit): Promise<OpenedDatabase | null> {
  try {
    if (hit.databaseId) return await openDatabase(hit.databaseId);
    if (hit.object === "data_source") return await openDataSource(hit.id);
    return await openDatabase(hit.id);
  } catch (error) {
    if (error instanceof NotionRequestError && (error.status === 401 || error.status === 403 || error.status === 404)) return null;
    throw error;
  }
}

export async function readPagePlainText(pageId: string): Promise<string> {
  const lines: string[] = [];
  await readBlocks(pageId, lines, 0);
  return lines.join("\n").trim();
}

export async function queryDatabasePages(opened: OpenedDatabase): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const body: { page_size: number; start_cursor?: string } = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const path =
      opened.version === "2025-09-03" && opened.dataSourceId
        ? `/data_sources/${opened.dataSourceId}/query`
        : `/databases/${opened.databaseId}/query`;
    const result = await notionFetch<QueryResult>(path, { method: "POST", version: opened.version, body });
    pages.push(...(result.results || []).filter((page) => page.object === "page"));
    cursor = result.has_more ? result.next_cursor || undefined : undefined;
  } while (cursor);
  return pages;
}

export async function queryNotionPages(): Promise<NotionPage[]> {
  const context = await getNotionContext();
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const body: { page_size: number; start_cursor?: string } = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const path =
      context.version === "2025-09-03" && context.dataSourceId
        ? `/data_sources/${context.dataSourceId}/query`
        : `/databases/${context.databaseId}/query`;
    const version = context.version === "2025-09-03" && context.dataSourceId ? "2025-09-03" : "2022-06-28";
    const result = await notionFetch<QueryResult>(path, { method: "POST", version, body });
    pages.push(...(result.results || []).filter((page) => page.object === "page"));
    cursor = result.has_more ? result.next_cursor || undefined : undefined;
  } while (cursor);
  return pages;
}

export async function retrieveNotionPage(pageId: string): Promise<NotionPage> {
  const context = await getNotionContext();
  return notionFetch<NotionPage>(`/pages/${pageId}`, { version: context.version });
}

export async function createNotionPage(properties: Record<string, unknown>): Promise<NotionPage> {
  const context = await getNotionContext();
  const parent =
    context.version === "2025-09-03" && context.dataSourceId
      ? { type: "data_source_id", data_source_id: context.dataSourceId }
      : { type: "database_id", database_id: context.databaseId };
  return notionFetch<NotionPage>("/pages", {
    method: "POST",
    version: context.version,
    body: { parent, properties },
  });
}

export async function createNotionPageIn(opened: OpenedDatabase, properties: Record<string, unknown>): Promise<NotionPage> {
  const parent =
    opened.version === "2025-09-03" && opened.dataSourceId
      ? { type: "data_source_id", data_source_id: opened.dataSourceId }
      : { type: "database_id", database_id: opened.databaseId };
  return notionFetch<NotionPage>("/pages", {
    method: "POST",
    version: opened.version,
    body: { parent, properties },
  });
}

export async function updateNotionPage(pageId: string, properties: Record<string, unknown>): Promise<NotionPage> {
  const context = await getNotionContext();
  return notionFetch<NotionPage>(`/pages/${pageId}`, {
    method: "PATCH",
    version: context.version,
    body: { properties },
  });
}

export async function replacePropertyOptions(
  propertyName: string,
  kind: "select" | "multi_select" | "status",
  options: SchemaOption[],
): Promise<void> {
  const context = await getNotionContext(true);
  const body = {
    properties: {
      [propertyName]: {
        [kind]: {
          options: options.map((option) => {
            const next: { id?: string; name: string; color?: string } = { name: option.name };
            if (option.id) next.id = option.id;
            if (option.color) next.color = option.color;
            return next;
          }),
        },
      },
    },
  };
  if (context.version === "2025-09-03" && context.dataSourceId) {
    await notionFetch(`/data_sources/${context.dataSourceId}`, {
      method: "PATCH",
      version: "2025-09-03",
      body,
    });
  } else {
    await notionFetch(`/databases/${context.databaseId}`, {
      method: "PATCH",
      version: "2022-06-28",
      body,
    });
  }
  clearNotionCache();
}

export async function archiveNotionPage(pageId: string): Promise<NotionPage> {
  const context = await getNotionContext();
  const primary = context.version === "2025-09-03" ? { in_trash: true } : { archived: true };
  try {
    return await notionFetch<NotionPage>(`/pages/${pageId}`, {
      method: "PATCH",
      version: context.version,
      body: primary,
    });
  } catch (error) {
    if (!(error instanceof NotionRequestError)) throw error;
    const fallback = "in_trash" in primary ? { archived: true } : { in_trash: true };
    return notionFetch<NotionPage>(`/pages/${pageId}`, {
      method: "PATCH",
      version: context.version,
      body: fallback,
    });
  }
}

type NotionDatabase = {
  title?: { plain_text?: string }[];
  properties?: Record<string, { type?: string; select?: { options?: { name: string }[] }; multi_select?: { options?: { name: string }[] }; status?: { options?: { name: string }[] } }>;
  data_sources?: { id: string; name?: string }[];
};

type SearchEntry = {
  object?: string;
  id: string;
  name?: string;
  title?: { plain_text?: string }[];
  parent?: { type?: string; database_id?: string };
};

type QueryResult = {
  results?: NotionPage[];
  has_more?: boolean;
  next_cursor?: string | null;
};

export type NotionPage = {
  object: string;
  id: string;
  url?: string;
  archived?: boolean;
  in_trash?: boolean;
  created_time?: string;
  last_edited_time?: string;
  properties: Record<string, unknown>;
};

type NotionBlock = {
  id: string;
  type?: string;
  has_children?: boolean;
  [key: string]: unknown;
};

async function readBlocks(blockId: string, lines: string[], depth: number): Promise<void> {
  if (depth > 3) return;
  let cursor: string | undefined;
  do {
    const path = `/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${encodeURIComponent(cursor)}` : ""}`;
    const result = await notionFetch<{ results?: NotionBlock[]; has_more?: boolean; next_cursor?: string | null }>(path, { version: "2022-06-28" });
    for (const block of result.results || []) {
      const text = blockText(block);
      if (text) lines.push(depth > 0 ? `${"  ".repeat(depth)}${text}` : text);
      if (block.has_children) await readBlocks(block.id, lines, depth + 1);
    }
    cursor = result.has_more ? result.next_cursor || undefined : undefined;
  } while (cursor);
}

function blockText(block: NotionBlock): string {
  const type = block.type || "";
  const body = block[type];
  if (!body || typeof body !== "object") return "";
  const rich = (body as { rich_text?: { plain_text?: string }[] }).rich_text;
  const text = Array.isArray(rich) ? rich.map((part) => part.plain_text || "").join("").trim() : "";
  if (!text) return "";
  if (type === "bulleted_list_item" || type === "numbered_list_item" || type === "to_do") return `• ${text}`;
  return text;
}

function readTitle(title?: { plain_text?: string }[]): string | undefined {
  const text = title?.map((part) => part.plain_text || "").join("").trim();
  return text || undefined;
}
