import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";
import { MAX_TEXT_CHARS, absoluteUrl } from "./normalize";
import { USER_AGENT } from "./util";

const MAX_HTML_CHARS = 1_500_000;
const MIN_TEXT_CHARS = 200;

export interface ExtractedArticle {
  text?: string;
  image?: string;
}

function metaImage(document: Document, base: string): string | undefined {
  const selectors = [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'meta[property="og:image:url"]',
  ];
  for (const selector of selectors) {
    const content = document.querySelector(selector)?.getAttribute("content");
    const resolved = absoluteUrl(content ?? undefined, base);
    if (resolved) return resolved;
  }
  return undefined;
}

/**
 * Downloads a page and pulls out the readable text (Readability) and the social image.
 * Returns null on any failure. Callers must never let this block a run.
 * The text is stored only as LLM input; the reader always links to the original.
 */
export async function extractArticle(url: string, timeoutMs = 8000): Promise<ExtractedArticle | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    if (!(response.headers.get("content-type") ?? "").includes("html")) return null;

    const html = (await response.text()).slice(0, MAX_HTML_CHARS);
    const base = response.url || url;
    // A silent VirtualConsole keeps jsdom's CSS parse warnings out of the terminal.
    const dom = new JSDOM(html, { url: base, virtualConsole: new VirtualConsole() });
    try {
      const image = metaImage(dom.window.document, base);
      const parsed = new Readability(dom.window.document).parse();
      const text = (parsed?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
      const usableText = text.length >= MIN_TEXT_CHARS ? text : undefined;
      if (!usableText && !image) return null;
      return { text: usableText, image };
    } finally {
      dom.window.close();
    }
  } catch {
    return null;
  }
}
