// Regenerates public/guide/retireflow-iul-playbook.pdf from public/guide/index.html.
// Usage: npm install && npm i --no-save playwright && npx playwright install chromium && npm run pdf
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

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
const logo = (await readFile(join(root, "assets/logo-color.png"))).toString("base64");
const base = { printBackground: true, preferCSSPageSize: true }; // size + margins come from @page rules
// Cover: no running header/footer.
const cover = await page.pdf({ ...base, pageRanges: "1" });
// Everything else: logo header + page numbers.
const body = await page.pdf({
  ...base,
  pageRanges: "2-",
  displayHeaderFooter: true,
  headerTemplate: `<div style="width:100%;margin:0 0.6in;padding-bottom:6px;border-bottom:1px solid #e6e9ec;display:flex;justify-content:space-between;align-items:center;font-family:Arial;font-size:8px;color:#5a6a78">
    <img src="data:image/png;base64,${logo}" style="height:26px"><span>The IUL Retirement Playbook</span></div>`,
  footerTemplate: `<div style="width:100%;margin:0 0.6in;display:flex;justify-content:space-between;font-family:Arial;font-size:8px;color:#5a6a78">
    <span>getretireflow.com</span><span>Page <span class="pageNumber"></span></span></div>`,
});

const out = await PDFDocument.create();
for (const bytes of [cover, body]) {
  const src = await PDFDocument.load(bytes);
  (await out.copyPages(src, src.getPageIndices())).forEach((pg) => out.addPage(pg));
}
out.setTitle("The IUL Retirement Playbook");
out.setAuthor("RetireFlow");
out.setSubject("7 questions to answer before you buy an Indexed Universal Life policy");
await writeFile(join(root, "guide/retireflow-iul-playbook.pdf"), await out.save());
await browser.close();
server.close();
console.log("Wrote public/guide/retireflow-iul-playbook.pdf");
