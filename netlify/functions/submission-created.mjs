// Netlify runs this function automatically for every *verified* (non-spam)
// Netlify Forms submission. For each lead it:
//   1. emails the lead (Resend)
//   2. emails you / the assigned agent a new-lead alert (Resend)
//   3. adds a row to your Google Sheet (Apps Script web app)
//
// Environment variables (Netlify → Site configuration → Environment variables):
//   RESEND_API_KEY             Your Resend API key (re_...)
//   EMAIL_FROM                 Verified sender, e.g. "RetireFlow <hello@getretireflow.com>"
//   LEADS_NOTIFY_EMAIL         Comma-separated addresses that get every new-lead alert
//   GOOGLE_SHEETS_WEBHOOK_URL  Apps Script web app URL (see google-sheets/Code.gs)
//   GOOGLE_SHEETS_SECRET       Must match SECRET in google-sheets/Code.gs
// Optional:
//   EMAIL_REPLY_TO             Fallback reply-to address
//   SITE_URL                   Public URL used in email links (defaults to Netlify's URL)

import { assignAgent } from "../lib/agents.mjs";
import { leadConfirmationEmail, agentNotificationEmail, guideEmail, guideAlertEmail } from "../lib/emails.mjs";

const RESEND_URL = "https://api.resend.com/emails";
const LEAD_TYPES = { "iul-consultation": "Consultation", "guide-request": "Guide Download" };

function list(v) {
  return String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
}

async function sendEmail(message, idempotencyKey) {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(message),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(out)}`);
  return out;
}

async function addToSheet(record) {
  const res = await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script reads the raw body
    body: JSON.stringify({ ...record, secret: process.env.GOOGLE_SHEETS_SECRET }),
    redirect: "follow",
  });
  const text = await res.text();
  let out;
  try { out = JSON.parse(text); } catch { throw new Error(`Google Sheets ${res.status}: unexpected response ${text.slice(0, 200)}`); }
  if (!out.ok) throw new Error(`Google Sheets: ${out.error || "unknown error"}`);
  return out;
}

export const handler = async (event) => {
  let payload;
  try {
    payload = JSON.parse(event.body || "{}").payload || {};
  } catch {
    return { statusCode: 400, body: "Invalid payload" };
  }

  const formName = payload.form_name;
  const leadType = LEAD_TYPES[formName];
  const lead = payload.data || {};
  if (!leadType) return { statusCode: 200, body: `Form "${formName}" has no handler` };
  if (!lead.email) return { statusCode: 200, body: "No email on submission; skipped" };

  const submissionId = payload.id || `${formName}-${lead.email}-${payload.created_at}`;
  const createdAt = payload.created_at || new Date().toISOString();
  const siteUrl = process.env.SITE_URL || process.env.URL || "https://getretireflow.com";
  const from = process.env.EMAIL_FROM;
  const notify = list(process.env.LEADS_NOTIFY_EMAIL);
  const emailReady = Boolean(process.env.RESEND_API_KEY && from);
  const sheetReady = Boolean(process.env.GOOGLE_SHEETS_WEBHOOK_URL && process.env.GOOGLE_SHEETS_SECRET);
  const agent = formName === "iul-consultation" ? assignAgent(lead.state, lead.email) : null;

  const jobs = [];

  // --- Google Sheet ---------------------------------------------------------
  if (sheetReady) {
    jobs.push(addToSheet({
      submission_id: submissionId,
      created_at: createdAt,
      lead_type: leadType,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      state: lead.state,
      age_range: lead.age_range,
      goal: lead.goal,
      consent: lead.consent === "yes"
        ? `Yes: ${formName === "iul-consultation" ? "call, text & email" : "email only"} (form v${lead.consent_version || "?"})`
        : "",
      agent_name: agent?.name,
      agent_email: agent?.email,
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
      utm_content: lead.utm_content,
      utm_term: lead.utm_term,
      landing_page: lead.landing_page,
    }));
  } else {
    console.warn("GOOGLE_SHEETS_WEBHOOK_URL / GOOGLE_SHEETS_SECRET not set; lead not added to sheet.");
  }

  // --- Emails ---------------------------------------------------------------
  if (!emailReady) {
    console.error("RESEND_API_KEY or EMAIL_FROM not set; no emails sent.");
  } else if (formName === "iul-consultation") {
    const submittedAt = new Date(createdAt).toLocaleString("en-US", { timeZone: "America/New_York" }) + " ET";

    const confirm = leadConfirmationEmail({ lead, agent, siteUrl });
    jobs.push(sendEmail({
      from,
      to: [lead.email],
      reply_to: agent.email || process.env.EMAIL_REPLY_TO || undefined,
      subject: confirm.subject,
      html: confirm.html,
      text: confirm.text,
      tags: [{ name: "type", value: "lead_confirmation" }],
    }, `${submissionId}-confirm`));

    const alert = agentNotificationEmail({ lead, agent, siteUrl, submittedAt });
    const to = agent.email ? [agent.email] : notify;
    const cc = notify.filter((e) => !to.includes(e));
    if (to.length) {
      jobs.push(sendEmail({
        from,
        to,
        ...(cc.length ? { cc } : {}),
        reply_to: lead.email,
        subject: alert.subject,
        html: alert.html,
        text: alert.text,
        tags: [{ name: "type", value: "lead_alert" }],
      }, `${submissionId}-alert`));
    }
  } else {
    const guide = guideEmail({ lead, siteUrl });
    jobs.push(sendEmail({
      from,
      to: [lead.email],
      reply_to: process.env.EMAIL_REPLY_TO || undefined,
      subject: guide.subject,
      html: guide.html,
      text: guide.text,
      tags: [{ name: "type", value: "guide_delivery" }],
    }, `${submissionId}-guide`));

    if (notify.length) {
      const alert = guideAlertEmail({ lead, siteUrl, submittedAt: new Date(createdAt).toLocaleString("en-US", { timeZone: "America/New_York" }) + " ET" });
      jobs.push(sendEmail({
        from,
        to: notify,
        reply_to: lead.email,
        subject: alert.subject,
        html: alert.html,
        text: alert.text,
        tags: [{ name: "type", value: "guide_alert" }],
      }, `${submissionId}-guide-alert`));
    }
  }

  if (!jobs.length) return { statusCode: 500, body: "Nothing configured: set the Resend and/or Google Sheets environment variables" };

  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === "rejected");
  failed.forEach((f) => console.error(f.reason));
  return failed.length
    ? { statusCode: 500, body: `${failed.length} of ${results.length} tasks failed` }
    : { statusCode: 200, body: `Completed ${results.length} task(s)` };
};
