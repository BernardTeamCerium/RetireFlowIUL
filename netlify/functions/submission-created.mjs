// Netlify runs this function automatically for every *verified* (non-spam)
// Netlify Forms submission. It sends the follow-up emails through Resend.
//
// Required environment variables (Netlify → Site configuration → Environment variables):
//   RESEND_API_KEY      Your Resend API key (re_...)
//   EMAIL_FROM          Verified sender, e.g. "RetireFlow <hello@getretireflow.com>"
// Optional:
//   EMAIL_REPLY_TO      Fallback reply-to address (defaults to the assigned agent's email)
//   LEADS_NOTIFY_EMAIL  Comma-separated addresses that get a copy of every lead alert
//   SITE_URL            Public URL used in email links (defaults to Netlify's URL)

import { assignAgent } from "../lib/agents.mjs";
import { leadConfirmationEmail, agentNotificationEmail, guideEmail } from "../lib/emails.mjs";

const RESEND_URL = "https://api.resend.com/emails";

function list(v) {
  return String(v || "").split(",").map((s) => s.trim()).filter(Boolean);
}

async function sendEmail(message, idempotencyKey) {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(message),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(out)}`);
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
  const lead = payload.data || {};
  const submissionId = payload.id || `${formName}-${lead.email}-${payload.created_at}`;
  const siteUrl = process.env.SITE_URL || process.env.URL || "https://getretireflow.com";
  const from = process.env.EMAIL_FROM;
  const notify = list(process.env.LEADS_NOTIFY_EMAIL);

  if (!process.env.RESEND_API_KEY || !from) {
    console.error("Missing RESEND_API_KEY or EMAIL_FROM; no emails sent.");
    return { statusCode: 500, body: "Email not configured" };
  }
  if (!lead.email) return { statusCode: 200, body: "No email on submission; skipped" };

  const jobs = [];

  if (formName === "iul-consultation") {
    const agent = assignAgent(lead.state, lead.email);
    const submittedAt = new Date(payload.created_at || Date.now()).toLocaleString("en-US", { timeZone: "America/New_York" }) + " ET";

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
  } else if (formName === "guide-request") {
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
      jobs.push(sendEmail({
        from,
        to: notify,
        reply_to: lead.email,
        subject: `New guide download: ${lead.first_name || ""} <${lead.email}>`,
        text: `Guide request\nName: ${lead.first_name || "-"}\nEmail: ${lead.email}\nSource: ${[lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ") || "direct"}`,
        tags: [{ name: "type", value: "guide_alert" }],
      }, `${submissionId}-guide-alert`));
    }
  } else {
    return { statusCode: 200, body: `Form "${formName}" has no email handler` };
  }

  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === "rejected");
  failed.forEach((f) => console.error(f.reason));
  return failed.length
    ? { statusCode: 500, body: `${failed.length} of ${results.length} emails failed` }
    : { statusCode: 200, body: `Sent ${results.length} email(s)` };
};
