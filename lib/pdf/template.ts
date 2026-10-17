import QRCode from "qrcode";
import type { HydratedEdition } from "@/lib/edition/load";
import { printStyles } from "./styles";
import { formatEditionDate } from "@/lib/utils/date";

export interface TemplateOptions {
  readerName?: string;
  userTimezone?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function generatePdfHtml(
  data: HydratedEdition,
  options: TemplateOptions = {}
): Promise<string> {
  const { edition, items } = data;
  const readerName = options.readerName || "Reader";
  const timezone = options.userTimezone || "Asia/Karachi";
  const formattedDate = formatEditionDate(edition.edition_date, timezone);

  // Group items by size/section
  const leadItem = items.find(({ item }) => item.size === "lead") ?? items[0];
  const otherItems = items.filter(({ article }) => article.id !== leadItem?.article.id);

  const majorItems = otherItems.filter(({ item }) => item.size === "major");
  const briefItems = otherItems.filter(({ item }) => item.size === "brief");
  const standardItems = otherItems.filter(
    ({ item }) => item.size !== "major" && item.size !== "brief" && item.size !== "lead"
  );

  // Group standard items by section
  const sectionMap = new Map<string, typeof standardItems>();
  for (const entry of standardItems) {
    const sec = entry.item.section || "Your World";
    if (!sectionMap.has(sec)) sectionMap.set(sec, []);
    sectionMap.get(sec)!.push(entry);
  }

  // Generate QR codes for up to 8 key featured stories
  const featuredForQr = [leadItem, ...majorItems, ...standardItems].slice(0, 8);
  const qrCodes = await Promise.all(
    featuredForQr.map(async ({ article }) => {
      try {
        const dataUrl = await QRCode.toDataURL(article.url, {
          width: 80,
          margin: 1,
          color: { dark: "#17140f", light: "#f7f3ec" },
        });
        return { id: article.id, title: article.title, source: article.source_name, dataUrl };
      } catch {
        return null;
      }
    })
  );

  // Index sections for Page 1 "Inside this edition"
  const allSectionNames = Array.from(new Set(items.map((i) => i.item.section)));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Your Orbit — ${escapeHtml(formattedDate)}</title>
  <style>
    ${printStyles}
  </style>
</head>
<body>

  <!-- ========================================== -->
  <!-- PAGE 1: FRONT PAGE                         -->
  <!-- ========================================== -->
  <div class="page">
    <header class="masthead">
      <h1 class="masthead-title">Your Orbit</h1>
      <div class="masthead-subbar sans">
        <span>${escapeHtml(formattedDate)}</span>
        <span>Prepared for ${escapeHtml(readerName)}</span>
        <span>Vol. I · No. ${edition.edition_date.replace(/-/g, "")}</span>
      </div>
    </header>

    ${
      edition.headline_of_the_day
        ? `<div class="headline-of-the-day">&ldquo;${escapeHtml(edition.headline_of_the_day)}&rdquo;</div>`
        : ""
    }

    <!-- Lead Story Grid -->
    ${
      leadItem
        ? `
      <section class="lead-grid avoid-break">
        <div>
          <div class="story-tag sans">${escapeHtml(leadItem.article.topics[0] ?? "Front Page")}</div>
          <h2 class="story-title" style="font-size: 19pt; line-height: 1.15; margin-bottom: 8px;">
            ${escapeHtml(leadItem.article.title)}
          </h2>
          <p class="story-summary drop-cap" style="font-size: 10pt; line-height: 1.45;">
            ${escapeHtml(leadItem.article.summary)}
          </p>
          ${
            leadItem.item.why_shown
              ? `<div class="why-shown-note sans">${escapeHtml(leadItem.item.why_shown)}</div>`
              : ""
          }
          ${
            leadItem.item.impact_note
              ? `
            <div class="impact-box sans">
              <strong style="color: var(--burgundy);">What this means for you:</strong> ${escapeHtml(leadItem.item.impact_note)}
            </div>
            `
              : ""
          }
          <div class="story-meta sans">
            <span><strong>${escapeHtml(leadItem.article.source_name)}</strong></span>
            <span>Lead Story</span>
          </div>
        </div>

        <div>
          ${
            leadItem.article.image_url
              ? `
            <div style="border: 1px solid var(--rule); overflow: hidden; max-height: 200px; margin-bottom: 6px;">
              <img src="${escapeHtml(leadItem.article.image_url)}" alt="${escapeHtml(leadItem.article.title)}" style="width: 100%; height: auto; object-fit: cover; display: block;" />
            </div>
            <div class="sans" style="font-size: 6.5pt; color: var(--ink-muted); text-align: right;">Photo / Source: ${escapeHtml(leadItem.article.source_name)}</div>
            `
              : `
            <div style="border: 1.5px solid var(--rule); background: #eee8dc; padding: 20px; text-align: center; margin-bottom: 6px;">
              <span style="font-size: 20pt; font-style: italic; color: rgba(23,20,15,0.4);">Your Orbit</span>
              <div class="sans" style="font-size: 7pt; text-transform: uppercase; margin-top: 4px; color: var(--ink-muted);">${escapeHtml(leadItem.article.source_name)}</div>
            </div>
            `
          }

          <!-- Inside this Edition Index Box -->
          <div class="callout-box" style="margin-top: 10px;">
            <div class="sans" style="font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; border-bottom: 1px solid var(--rule); padding-bottom: 3px; margin-bottom: 6px;">
              Inside this edition
            </div>
            <div class="sans" style="font-size: 7.5pt; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
              ${allSectionNames
                .map((sec) => `<div>• <strong>${escapeHtml(sec)}</strong></div>`)
                .join("")}
            </div>
          </div>
        </div>
      </section>
      `
        : ""
    }

    <!-- 2 to 3 Major Stories in Columns -->
    ${
      majorItems.length > 0
        ? `
      <section class="two-col">
        ${majorItems
          .slice(0, 2)
          .map(
            ({ item, article }) => `
          <div class="story-item avoid-break">
            <div class="story-tag sans">${escapeHtml(article.topics[0] ?? "Major")}</div>
            <h3 class="story-title" style="font-size: 12.5pt;">${escapeHtml(article.title)}</h3>
            <p class="story-summary">${escapeHtml(article.summary)}</p>
            ${item.why_shown ? `<div class="why-shown-note sans">${escapeHtml(item.why_shown)}</div>` : ""}
            ${
              item.impact_note
                ? `<div class="impact-box sans"><strong style="color: var(--burgundy);">Impact:</strong> ${escapeHtml(item.impact_note)}</div>`
                : ""
            }
            <div class="story-meta sans">
              <span>${escapeHtml(article.source_name)}</span>
            </div>
          </div>
        `
          )
          .join("")}
      </section>
      `
        : ""
    }

    <footer class="folio-footer sans">
      <span>Your Orbit · Personalized Broadsheet</span>
      <span>Page 1</span>
    </footer>
  </div>

  <!-- ========================================== -->
  <!-- PAGE 2: INNER SECTIONS & STORY CONNECTIONS -->
  <!-- ========================================== -->
  <div class="page">
    <header class="folio-header sans">
      <span>Your Orbit · Inside Edition</span>
      <span>${escapeHtml(formattedDate)}</span>
      <span>Page 2</span>
    </header>

    <!-- Story Connection Box (M10) if present -->
    ${
      edition.connections && edition.connections.length > 0
        ? `
      <section class="callout-box avoid-break" style="border: 1.5px solid var(--ink); margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--rule); padding-bottom: 3px; margin-bottom: 6px;">
          <span class="sans" style="font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--burgundy);">
            How It Connects
          </span>
          <span class="sans" style="font-size: 6.5pt; text-transform: uppercase; color: var(--ink-muted);">AI Analysis</span>
        </div>
        <h3 style="font-size: 11pt; font-weight: 600; margin-bottom: 4px;">${escapeHtml(edition.connections[0].title)}</h3>
        <p class="story-summary" style="margin-bottom: 6px;">${escapeHtml(edition.connections[0].explanation)}</p>
        <div class="sans" style="font-size: 7pt; color: var(--ink-muted); display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
          ${edition.connections[0].chain
            .map((s, idx) => `<span>[${idx + 1}] ${escapeHtml(s.step)}</span>`)
            .join(" &rarr; ")}
        </div>
      </section>
      `
        : ""
    }

    <!-- Section Groups in Two Columns -->
    <div class="two-col">
      ${Array.from(sectionMap.entries())
        .map(
          ([secName, secItems]) => `
        <div>
          <div class="section-divider">
            <span class="title">${escapeHtml(secName)}</span>
            <div class="line"></div>
          </div>
          ${secItems
            .map(
              ({ item, article }) => `
            <div class="story-item avoid-break">
              <div class="story-tag sans">${escapeHtml(article.topics[0] ?? "News")}</div>
              <h4 class="story-title" style="font-size: 10.5pt;">${escapeHtml(article.title)}</h4>
              <p class="story-summary">${escapeHtml(article.summary)}</p>
              ${item.why_shown ? `<div class="why-shown-note sans">${escapeHtml(item.why_shown)}</div>` : ""}
              ${
                item.impact_note
                  ? `<div class="impact-box sans"><strong style="color: var(--burgundy);">Impact:</strong> ${escapeHtml(item.impact_note)}</div>`
                  : ""
              }
              <div class="story-meta sans">
                <span>${escapeHtml(article.source_name)}</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `
        )
        .join("")}
    </div>

    <footer class="folio-footer sans">
      <span>Curated for ${escapeHtml(readerName)}</span>
      <span>Page 2</span>
    </footer>
  </div>

  <!-- ========================================== -->
  <!-- PAGE 3: BACK PAGE — IN BRIEF & QR INDEX    -->
  <!-- ========================================== -->
  <div class="page">
    <header class="folio-header sans">
      <span>Your Orbit · Back Page</span>
      <span>${escapeHtml(formattedDate)}</span>
      <span>Page 3</span>
    </header>

    <!-- Reading Summary -->
    <div class="reading-summary-banner sans">
      <div>
        <div style="font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--burgundy);">
          Weekly Reading Orbit
        </div>
        <div style="font-size: 8pt; color: var(--ink); margin-top: 2px;">
          Prepared with articles across ${items.length} stories tailored to your interests in ${allSectionNames.slice(0, 3).join(", ")}.
        </div>
      </div>
      <div style="font-size: 7.5pt; text-align: right; color: var(--ink-muted);">
        A little more informed,<br />every morning.
      </div>
    </div>

    <!-- In Brief Section -->
    ${
      briefItems.length > 0
        ? `
      <div class="section-divider">
        <span class="title">In Brief</span>
        <div class="line"></div>
      </div>
      <div class="three-col">
        ${briefItems
          .map(
            ({ item, article }) => `
          <div class="story-item avoid-break" style="font-size: 8pt; border-bottom: 1px solid var(--rule); padding-bottom: 8px;">
            <div class="story-tag sans" style="font-size: 6.5pt;">${escapeHtml(article.topics[0] ?? "Update")}</div>
            <h4 class="story-title" style="font-size: 9pt;">${escapeHtml(article.title)}</h4>
            <p class="story-summary" style="font-size: 7.5pt;">${escapeHtml(article.summary)}</p>
            <div class="story-meta sans" style="font-size: 6.5pt;">
              <span>${escapeHtml(article.source_name)}</span>
            </div>
          </div>
        `
          )
          .join("")}
      </div>
      `
        : ""
    }

    <!-- QR Code Digital Pass Index -->
    <div class="section-divider" style="margin-top: 18px;">
      <span class="title">Scan to Read Originals</span>
      <div class="line"></div>
    </div>
    <div class="sans" style="font-size: 7pt; color: var(--ink-muted); margin-bottom: 6px;">
      Point your phone camera at any code to open the full article on the publisher&apos;s site:
    </div>

    <div class="qr-grid">
      ${qrCodes
        .filter((q): q is NonNullable<typeof q> => q !== null)
        .map(
          (q) => `
        <div class="qr-item">
          <img src="${q.dataUrl}" alt="QR code" />
          <div class="qr-title sans">${escapeHtml(q.title)}</div>
          <div class="sans" style="font-size: 6pt; color: var(--ink-muted);">${escapeHtml(q.source)}</div>
        </div>
      `
        )
        .join("")}
    </div>

    <footer class="folio-footer sans" style="margin-top: 24px;">
      <span>Your Orbit · "A little more informed, every morning."</span>
      <span>Page 3</span>
    </footer>
  </div>

</body>
</html>`;
}
