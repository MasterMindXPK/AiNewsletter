import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer, { type Browser } from "puppeteer";
import type { HydratedEdition } from "@/lib/edition/load";
import { generatePdfHtml, type TemplateOptions } from "./template";

function ensurePdfDir(): string {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dir = isServerless ? path.join(os.tmpdir(), "orbit-pdfs") : path.join(process.cwd(), "data", "pdfs");
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch {
    const fallback = path.join(os.tmpdir(), "orbit-pdfs");
    fs.mkdirSync(fallback, { recursive: true });
    return fallback;
  }
}

export function getCachedPdfPath(editionId: string): string {
  const dir = ensurePdfDir();
  return path.join(dir, `${editionId}.pdf`);
}

function findSystemBrowserExecutable(): string | undefined {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];

  for (const c of candidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ c)) {
      return c;
    }
  }
  return undefined;
}

/**
 * Renders an edition to a print broadsheet PDF.
 * Checks for a cached PDF in data/pdfs/{editionId}.pdf first.
 * If forceRegenerate is true or cache is missing, renders with Puppeteer.
 */
export async function renderEditionPdf(
  data: HydratedEdition,
  options: TemplateOptions & { forceRegenerate?: boolean } = {}
): Promise<Buffer> {
  const { edition } = data;
  const pdfPath = getCachedPdfPath(edition.id);

  // Return cached PDF if present and not force-regenerating
  if (!options.forceRegenerate && fs.existsSync(pdfPath)) {
    try {
      return fs.readFileSync(pdfPath);
    } catch {
      // Proceed to regenerate if read fails
    }
  }

  // Generate broadsheet HTML template
  const html = await generatePdfHtml(data, options);

  const executablePath = findSystemBrowserExecutable();

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    });

    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: ["load", "domcontentloaded"],
      timeout: 30000,
    });

    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "10mm",
        bottom: "14mm",
        left: "10mm",
      },
    });

    const buffer = Buffer.from(pdfUint8);

    // Save to cache
    try {
      fs.writeFileSync(pdfPath, buffer);
    } catch (writeErr) {
      console.warn("[renderEditionPdf] failed to write to cache:", writeErr);
    }

    return buffer;
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }
}
