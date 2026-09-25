/**
 * Notion page import.
 *
 * This deliberately does NOT accept an arbitrary URL and go scrape it —
 * that would be unreliable, against Notion's terms, and (worse) would let
 * anyone point this server at any URL they like (a classic SSRF hole).
 * Instead:
 *
 *  1. The URL the person pastes is only ever used to *parse out a page ID*
 *     on this server — it is never fetched directly.
 *  2. We only accept URLs shaped like a Notion page link
 *     (app.notion.com/p/…, notion.so/…, or a *.notion.site page) and reject
 *     everything else with a clear error.
 *  3. The only network call this makes is to Notion's official REST API
 *     (api.notion.com), for that one page ID — never a workspace search,
 *     never a recursive crawl of sub-pages/databases. If that page hasn't
 *     been explicitly shared with the signed-in user's connection inside
 *     Notion itself, the API call fails — Notion's own sharing model is the
 *     second, independent guarantee that this can only ever reach a page
 *     the person chose to expose, not their whole workspace.
 *
 * The access token comes from that user's OAuth connection and is never
 * shared with another Memora account.
 */

const NOTION_API_VERSION = "2026-03-11";
const NOTION_API_BASE = "https://api.notion.com/v1";

export class NotionImportError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

/**
 * Accepts only Notion page URLs:
 *  - https://app.notion.com/p/<id>[/...]
 *  - https://www.notion.so/<slug-id> or https://notion.so/<slug-id>
 *  - https://<workspace>.notion.site/<slug-id>  (public Notion sites)
 * Anything else (a different domain, a workspace root, a database/search
 * URL with no page id) is rejected before any network call is made.
 */
export function extractNotionPageId(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new NotionImportError("That doesn't look like a valid URL.");
  }

  const host = url.hostname.toLowerCase();
  const isAllowedHost =
    host === "app.notion.com" ||
    host === "notion.so" ||
    host === "www.notion.so" ||
    host.endsWith(".notion.site");

  if (!isAllowedHost) {
    throw new NotionImportError(
      "Only links to a single Notion page are supported (app.notion.com/p/…, notion.so/…, or a *.notion.site page)."
    );
  }

  // A Notion page id is a 32-character hex string, with or without dashes,
  // and it's always the last id-shaped segment in the URL path.
  const hexId = url.pathname.match(/([0-9a-f]{32})(?:[/?#]|$)/i)?.[1];
  const dashedId = url.pathname.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1];
  const raw = (dashedId ?? hexId)?.replace(/-/g, "");

  if (!raw || raw.length !== 32) {
    throw new NotionImportError(
      "We couldn't find a page ID in that link. Open the page in Notion, use Share → Copy link, and paste that here."
    );
  }

  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

interface NotionRichText {
  plain_text: string;
  href?: string | null;
  annotations?: { bold?: boolean; italic?: boolean; code?: boolean; strikethrough?: boolean };
}

function richTextToMarkdown(rich: NotionRichText[] | undefined): string {
  if (!rich || rich.length === 0) return "";
  return rich
    .map((t) => {
      let text = t.plain_text ?? "";
      if (t.annotations?.code) text = `\`${text}\``;
      if (t.annotations?.bold) text = `**${text}**`;
      if (t.annotations?.italic) text = `*${text}*`;
      if (t.annotations?.strikethrough) text = `~~${text}~~`;
      if (t.href) text = `[${text}](${t.href})`;
      return text;
    })
    .join("");
}

interface NotionBlock {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
}

export async function notionFetch(path: string, accessToken: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${NOTION_API_BASE}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": NOTION_API_VERSION,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new NotionImportError(
      "Memoria couldn't find that page. Make sure it's shared with the Memoria Notion integration (••• menu → Connections → add it) and try again."
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new NotionImportError("Notion rejected the request. Reconnect your Notion account in Settings.", res.status);
  }
  if (!res.ok) {
    throw new NotionImportError(`Notion API returned an error (status ${res.status}). Please try again.`);
  }
  return res.json();
}

/** Converts a single page's blocks to Markdown. Does not recurse into child pages/databases — only this one page's own content. */
async function blocksToMarkdown(blockId: string, accessToken: string, depth = 0): Promise<string> {
  if (depth > 4) return ""; // guard against pathological nesting

  const lines: string[] = [];
  let cursor: string | undefined;

  do {
    const query = cursor ? `?start_cursor=${encodeURIComponent(cursor)}&page_size=100` : "?page_size=100";
    const data = await notionFetch(`/blocks/${blockId}/children${query}`, accessToken);
    const blocks: NotionBlock[] = data.results ?? [];

    for (const block of blocks) {
      const indent = "  ".repeat(depth);
      const t = block.type;
      const value = (block as any)[t] ?? {};
      const text = richTextToMarkdown(value.rich_text);

      switch (t) {
        case "heading_1":
          lines.push(`# ${text}`);
          break;
        case "heading_2":
          lines.push(`## ${text}`);
          break;
        case "heading_3":
          lines.push(`### ${text}`);
          break;
        case "paragraph":
          if (text) lines.push(`${indent}${text}`);
          break;
        case "bulleted_list_item":
          lines.push(`${indent}- ${text}`);
          break;
        case "numbered_list_item":
          lines.push(`${indent}1. ${text}`);
          break;
        case "to_do":
          lines.push(`${indent}- [${value.checked ? "x" : " "}] ${text}`);
          break;
        case "quote":
          lines.push(`${indent}> ${text}`);
          break;
        case "callout":
          lines.push(`${indent}> ${text}`);
          break;
        case "code":
          lines.push("```" + (value.language ?? ""));
          lines.push(text);
          lines.push("```");
          break;
        case "divider":
          lines.push("---");
          break;
        case "image":
          // Images aren't imported — see the "images aren't supported" notice surfaced to the user.
          lines.push(`${indent}*[image omitted — Memoria only imports text]*`);
          break;
        case "child_page":
          // Intentionally NOT recursed into — importing a page must only
          // ever touch that one page, never its sub-pages.
          lines.push(`${indent}*[sub-page "${value.title ?? "untitled"}" not imported — only this page's own content is]*`);
          break;
        case "table_row": {
          const cells = ((value.cells ?? []) as NotionRichText[][]).map((c) => richTextToMarkdown(c));
          lines.push(`| ${cells.join(" | ")} |`);
          break;
        }
        default:
          if (text) lines.push(`${indent}${text}`);
      }

      if (block.has_children && t !== "child_page") {
        const nested = await blocksToMarkdown(block.id, accessToken, depth + 1);
        if (nested) lines.push(nested);
      }
    }

    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return lines.join("\n\n");
}

export interface NotionImportResult {
  title: string;
  content: string;
  hasImages: boolean;
}

/** Imports exactly one Notion page (never more) given its public URL. */
export async function importNotionPage(rawUrl: string, accessToken: string): Promise<NotionImportResult> {
  const pageId = extractNotionPageId(rawUrl);

  const page = await notionFetch(`/pages/${pageId}`, accessToken);
  const titleProp = Object.values(page.properties ?? {}).find((p: any) => p?.type === "title") as
    | { title: NotionRichText[] }
    | undefined;
  const title = richTextToMarkdown(titleProp?.title) || "Untitled Notion page";

  const content = await blocksToMarkdown(pageId, accessToken);
  if (!content.trim()) {
    throw new NotionImportError("That Notion page doesn't have any text content to import.");
  }

  return { title, content, hasImages: content.includes("*[image omitted") };
}
