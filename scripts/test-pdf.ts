import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { loadMockEdition } from "../lib/edition/load";
import { renderEditionPdf } from "../lib/pdf/render";
import { generatePdfHtml } from "../lib/pdf/template";

async function runTests() {
  console.log("=== Testing Module M7: PDF Broadsheet Edition ===");

  // 1. Test HTML Template Generation
  console.log("1. Generating broadsheet HTML template...");
  const t0 = performance.now();
  const mockData = loadMockEdition();
  const html = await generatePdfHtml(mockData, {
    readerName: "Ayesha Khan",
    userTimezone: "Asia/Karachi",
  });
  const htmlTime = performance.now() - t0;
  console.log(`  ok  HTML template generated in ${htmlTime.toFixed(1)}ms`);

  assert.ok(html.includes("Your Orbit"), "HTML should include masthead");
  assert.ok(html.includes("Ayesha Khan"), "HTML should include reader name");
  assert.ok(html.includes("Inside this edition"), "HTML should include page 1 index");
  assert.ok(html.includes("Scan to Read Originals"), "HTML should include QR code section");
  assert.ok(html.includes("data:image/png;base64,"), "HTML should include rendered QR code data URIs");

  // 2. Test Puppeteer PDF Render
  console.log("\n2. Rendering PDF via Puppeteer...");
  const t1 = performance.now();
  const pdfBuffer = await renderEditionPdf(mockData, {
    readerName: "Ayesha Khan",
    userTimezone: "Asia/Karachi",
    forceRegenerate: true,
  });
  const pdfTime = performance.now() - t1;
  console.log(`  ok  PDF generated in ${(pdfTime / 1000).toFixed(2)}s (spec requires < 10s)`);
  assert.ok(pdfTime < 10000, "PDF generation should take under 10 seconds");

  // Verify PDF header magic bytes (%PDF-)
  const magic = pdfBuffer.slice(0, 5).toString("utf8");
  assert.equal(magic, "%PDF-", "File should have valid PDF magic bytes");
  console.log(`  ok  PDF size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

  // Verify caching
  const cachePath = path.join(process.cwd(), "data", "pdfs", `${mockData.edition.id}.pdf`);
  assert.ok(fs.existsSync(cachePath), "PDF should be cached to data/pdfs/");
  console.log(`  ok  Cached at: ${cachePath}`);

  // 3. Test Cached Read Speed
  console.log("\n3. Testing cached retrieval speed...");
  const t2 = performance.now();
  const cachedBuffer = await renderEditionPdf(mockData, {
    readerName: "Ayesha Khan",
    forceRegenerate: false,
  });
  const cacheTime = performance.now() - t2;
  console.log(`  ok  Cached read in ${cacheTime.toFixed(2)}ms`);
  assert.equal(cachedBuffer.length, pdfBuffer.length, "Cached buffer should match");

  console.log("\nAll M7 PDF tests passed successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
