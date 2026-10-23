// Renders every .mmd in this folder to PNG (png/) using Mermaid from a CDN and Playwright.
// Usage: cd apps/web && node ../../docs/diagrams/render.mjs   (needs internet for the Mermaid script)
import { createRequire } from "node:module";
import { readdirSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// playwright is resolved from the folder you run this in (apps/web has it installed)
const { chromium } = createRequire(join(process.cwd(), "package.json"))("playwright");
const dir = dirname(fileURLToPath(import.meta.url));
const out = join(dir, "png");
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent('<html><body style="margin:0;background:#fff"><div id="c" style="display:inline-block;padding:24px"></div></body></html>');
await page.addScriptTag({ url: "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js" });
await page.evaluate(() => window.mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" }));
let failed = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".mmd")).sort()) {
  const code = readFileSync(join(dir, f), "utf8");
  try {
    await page.evaluate(async (c) => {
      const { svg } = await window.mermaid.render("d" + Math.random().toString(36).slice(2), c);
      document.getElementById("c").innerHTML = svg;
    }, code);
    await page.locator("#c").screenshot({ path: join(out, f.replace(".mmd", ".png")) });
    console.log("ok  ", f);
  } catch (e) {
    failed++;
    console.log("FAIL", f, String(e.message).split("\n")[0]);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
