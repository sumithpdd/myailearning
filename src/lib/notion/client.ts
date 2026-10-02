import { existsSync, readFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import tls from "node:tls";
import { parseSchema, type NotionSchema } from "@/lib/notion/schema";

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

export async function updateNotionPage(pageId: string, properties: Record<string, unknown>): Promise<NotionPage> {
  const context = await getNotionContext();
  return notionFetch<NotionPage>(`/pages/${pageId}`, {
    method: "PATCH",
    version: context.version,
    body: { properties },
  });
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

function readTitle(title?: { plain_text?: string }[]): string | undefined {
  const text = title?.map((part) => part.plain_text || "").join("").trim();
  return text || undefined;
}
