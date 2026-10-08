// Setup checker: open https://YOUR-SITE/.netlify/functions/lead-check
// It reports which settings are present and tests the Google Sheet
// connection WITHOUT adding a row. It never shows secret values.

const ENV = [
  ["RESEND_API_KEY", "Emails (Resend API key)"],
  ["EMAIL_FROM", "Emails (sender address)"],
  ["LEADS_NOTIFY_EMAIL", "New-lead alert recipients"],
  ["GOOGLE_SHEETS_WEBHOOK_URL", "Google Sheet web app URL"],
  ["GOOGLE_SHEETS_SECRET", "Google Sheet password"],
  ["META_PIXEL_ID", "Meta Conversions API (Pixel ID)"],
  ["META_CAPI_TOKEN", "Meta Conversions API (token)"],
];

async function checkSheet() {
  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const secret = process.env.GOOGLE_SHEETS_SECRET;
  if (!url || !secret) return { ok: false, msg: "Not tested: GOOGLE_SHEETS_WEBHOOK_URL and/or GOOGLE_SHEETS_SECRET are missing in Netlify (or the site wasn’t redeployed after adding them)." };
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url.trim())) {
    return { ok: false, msg: "The web app URL doesn’t look right. It should look like https://script.google.com/macros/s/AKfy…/exec, copied from Deploy → Manage deployments → Web app URL (not the editor URL, and ending in /exec, not /dev)." };
  }
  let res, text;
  try {
    res = await fetch(url.trim(), { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ secret, ping: true }), redirect: "follow" });
    text = await res.text();
  } catch (err) {
    return { ok: false, msg: `Couldn’t reach Google: ${err.message}` };
  }
  let out;
  try { out = JSON.parse(text); } catch {
    if (/accounts\.google\.com|ServiceLogin|Sign in/i.test(text)) {
      return { ok: false, msg: "Google asked for a sign-in. In Apps Script, go to Deploy → Manage deployments → Edit and set “Who has access” to “Anyone” (not “Anyone with a Google account” or “Only myself”). If “Anyone” isn’t offered, your Google Workspace admin blocks public web apps: put the sheet and script in a personal Gmail account instead." };
    }
    if (res.status === 404 || /not found|unable to open the file/i.test(text)) {
      return { ok: false, msg: "Google says this web app doesn’t exist. Re-copy the Web app URL from Deploy → Manage deployments." };
    }
    return { ok: false, msg: `Google returned an unexpected page (HTTP ${res.status}). Most often “Who has access” isn’t set to “Anyone”, or the deployment was archived.` };
  }
  if (out.ok && out.pong) return { ok: true, msg: `Connected. The password matches, and leads will go to the “${out.sheet}” tab.` };
  if (out.ok && !out.pong) return { ok: false, msg: "Connected, but the script is an older version (and a blank test row may have been added; delete it). Paste the latest google-sheets/Code.gs, then Deploy → Manage deployments → Edit → Version: New version → Deploy." };
  if (out.error === "unauthorized") return { ok: false, msg: "Connected, but the password doesn’t match. GOOGLE_SHEETS_SECRET in Netlify must be exactly the text between the quotes in the script’s SECRET line (no quotes, no spaces). After changing the script, save and deploy a New version; after changing Netlify, redeploy." };
  return { ok: false, msg: `The script returned an error: ${out.error || "unknown"}. In Apps Script, run “setup” once and approve permissions, then deploy a New version.` };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const handler = async () => {
  const sheet = await checkSheet();
  const rows = ENV.map(([k, label]) => {
    const set = Boolean(process.env[k] && process.env[k].trim());
    return `<tr><td>${set ? "✅" : "❌"}</td><td><code>${k}</code></td><td>${label}</td></tr>`;
  }).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>RetireFlow setup check</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;color:#1d2733;line-height:1.5}h1{color:#041c39}table{border-collapse:collapse;width:100%}td{padding:8px;border-bottom:1px solid #e6e9ec;vertical-align:top}.box{padding:16px 18px;border-radius:12px;margin:12px 0}.ok{background:#e1f1f1}.bad{background:#fdecea}code{background:#f3f4f6;padding:1px 5px;border-radius:4px}</style></head><body>
<h1>RetireFlow setup check</h1>
<p>✅ <strong>Netlify functions are deployed.</strong> (If you can see this page, the function that sends emails and sheet rows is installed.)</p>
<h2>Google Sheet connection</h2>
<div class="box ${sheet.ok ? "ok" : "bad"}">${sheet.ok ? "✅" : "❌"} ${esc(sheet.msg)}</div>
<h2>Environment variables</h2>
<table>${rows}</table>
<p style="color:#5a6a78;font-size:14px">Values are never shown. Changed a variable? Redeploy the site (Deploys → Trigger deploy) before checking again. Make sure each variable’s scope includes <strong>Functions</strong>.</p>
<h2>Still no rows?</h2>
<ol>
<li>Netlify → <strong>Forms</strong>: is your test there? If not, turn on form detection and redeploy.</li>
<li>Is it under <strong>Spam submissions</strong>? Spam-flagged entries don’t trigger emails or sheet rows. Mark it “Not spam” and test again with real-looking details.</li>
<li>Netlify → <strong>Logs → Functions → submission-created</strong>: any errors listed there tell you what failed.</li>
</ol>
</body></html>`;
  return { statusCode: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }, body: html };
};
