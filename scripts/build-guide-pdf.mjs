// Regenerates public/guide/retireflow-iul-playbook.pdf from public/guide/index.html.
// Usage: npm i -D playwright && npx playwright install chromium && npm run pdf
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = fileURLToPath(new URL("../public", import.meta.url));
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

const server = http.createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (p.endsWith("/")) p += "index.html";
  try {
    const body = await readFile(join(root, p));
    res.writeHead(200, { "Content-Type": types[extname(p)] || "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end(); }
}).listen(0);

const url = `http://localhost:${server.address().port}/guide/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({
  path: join(root, "guide/retireflow-iul-playbook.pdf"),
  format: "Letter",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: '<div style="width:100%;font-size:8px;color:#5a6a78;text-align:center;font-family:Arial">The IUL Retirement Playbook · RetireFlow · getretireflow.com · Page <span class="pageNumber"></span></div>',
  margin: { top: "0.6in", bottom: "0.7in", left: "0.6in", right: "0.6in" },
});
await browser.close();
server.close();
console.log("Wrote public/guide/retireflow-iul-playbook.pdf");
