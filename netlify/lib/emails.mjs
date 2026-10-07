// Email templates sent through Resend. Table-based HTML with inline styles so
// they render consistently in Gmail, Outlook, and Apple Mail.

const NAVY = "#041c39";
const TEAL = "#077b82";
const MINT = "#f5faf6";
const MUTED = "#5a6a78";

export function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function abs(siteUrl, path) {
  if (!path) return "";
  return /^https?:\/\//i.test(path) ? path : siteUrl.replace(/\/$/, "") + path;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:12px;background:${TEAL}">
    <a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font-family:Manrope,Arial,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px">${esc(label)}</a>
  </td></tr></table>`;
}

function layout({ siteUrl, preheader, body }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RetireFlow</title></head>
<body style="margin:0;padding:0;background:${MINT}">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${MINT}">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
    <tr><td align="center" style="padding:0 0 20px"><img src="${abs(siteUrl, "/assets/logo-color.png")}" width="120" alt="RetireFlow Retirement Planning" style="display:block;height:auto;border:0"></td></tr>
    <tr><td style="background:#ffffff;border-radius:16px;border-top:6px solid ${TEAL};padding:36px 32px;font-family:Manrope,Arial,sans-serif;font-size:16px;line-height:1.6;color:#1d2733">
      ${body}
    </td></tr>
    <tr><td style="padding:22px 16px;font-family:Manrope,Arial,sans-serif;font-size:11px;line-height:1.55;color:${MUTED};text-align:center">
      You’re receiving this because you requested information at ${esc(siteUrl.replace(/^https?:\/\//, ""))}.<br>
      RetireFlow connects consumers with independent licensed insurance professionals. Indexed Universal Life is a life insurance product, not a stock market investment. Policy loans and withdrawals reduce cash value and death benefit and may have tax consequences. This is not tax or legal advice.<br><br>
      Don’t want these emails? Just reply “unsubscribe.”
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

function agentCard(agent, siteUrl) {
  const photo = agent.photo
    ? `<td width="76" valign="top" style="padding-right:16px"><img src="${esc(abs(siteUrl, agent.photo))}" width="72" height="72" alt="${esc(agent.name)}" style="display:block;border-radius:50%;object-fit:cover"></td>`
    : "";
  const lines = [
    `<div style="font-size:19px;font-weight:800;color:${NAVY}">${esc(agent.name)}</div>`,
    `<div style="color:${MUTED};font-size:14px">${esc(agent.title)}${agent.npn ? ` · NPN ${esc(agent.npn)}` : ""}</div>`,
    agent.phone ? `<div style="margin-top:8px">📞 <a href="tel:${esc(agent.phone.replace(/[^\d+]/g, ""))}" style="color:${TEAL};font-weight:700;text-decoration:none">${esc(agent.phone)}</a></div>` : "",
    agent.email ? `<div>✉️ <a href="mailto:${esc(agent.email)}" style="color:${TEAL};font-weight:700;text-decoration:none">${esc(agent.email)}</a></div>` : "",
  ].join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${MINT};border-radius:12px;border-left:5px solid ${TEAL}">
    <tr><td style="padding:20px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${photo}<td valign="top" style="font-family:Manrope,Arial,sans-serif;font-size:15px;line-height:1.55">${lines}</td></tr></table></td></tr>
  </table>`;
}

// --- 1. Lead confirmation: "Meet your licensed professional" ---------------
export function leadConfirmationEmail({ lead, agent, siteUrl }) {
  const first = esc(lead.first_name || "there");
  const guideUrl = abs(siteUrl, "/guide/");
  const cta = agent.bookingUrl
    ? `<p style="margin:24px 0 8px"><strong style="color:${NAVY}">Want to skip the phone tag?</strong> Pick a time that works for you:</p>${button(agent.bookingUrl, "Book My Free Review")}`
    : "";
  const body = `
    <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:${NAVY};font-weight:800">You’re matched, ${first}! 🎉</h1>
    <p style="margin:0 0 20px">Thanks for your interest in growing and protecting your retirement with an Indexed Universal Life policy. We’ve connected you with a licensed professional in <strong>${esc(lead.state)}</strong> who will personally help you:</p>
    ${agentCard(agent, siteUrl)}
    <p style="margin:24px 0 8px"><strong style="color:${NAVY}">What happens next</strong></p>
    <ol style="margin:0 0 8px;padding-left:20px">
      <li style="margin-bottom:6px">${esc(agent.name.startsWith("The ") ? "Your professional" : agent.name.split(" ")[0])} will reach out by phone, text, or email, usually within one business day.</li>
      <li style="margin-bottom:6px">You’ll have a short, no-pressure conversation about your goals${lead.goal ? ` (you told us: <em>${esc(lead.goal)}</em>)` : ""}.</li>
      <li>You’ll get a personalized illustration showing how a policy could fit your budget. No cost and no obligation.</li>
    </ol>
    ${cta}
    <p style="margin:28px 0 12px"><strong style="color:${NAVY}">While you wait</strong>, here’s your free guide, <em>The IUL Retirement Playbook</em>, with the 7 questions to ask before you buy:</p>
    ${button(guideUrl, "Read the Free Playbook")}
    <p style="margin:28px 0 0">To your retirement,<br><strong>The RetireFlow Team</strong></p>`;
  return {
    subject: `${lead.first_name ? lead.first_name + ", meet" : "Meet"} your licensed RetireFlow professional`,
    html: layout({ siteUrl, preheader: `${agent.name} will help you explore your IUL options. Here’s how to reach them.`, body }),
    text: [
      `You're matched, ${lead.first_name || "there"}!`,
      ``,
      `Your licensed professional: ${agent.name}, ${agent.title}${agent.npn ? ` (NPN ${agent.npn})` : ""}`,
      agent.phone ? `Phone: ${agent.phone}` : "",
      agent.email ? `Email: ${agent.email}` : "",
      agent.bookingUrl ? `Book a time: ${agent.bookingUrl}` : "",
      ``,
      `They'll reach out, usually within one business day, for a short, no-pressure conversation.`,
      ``,
      `Your free guide, The IUL Retirement Playbook: ${guideUrl}`,
      ``,
      `- The RetireFlow Team`,
    ].filter((l) => l !== "").join("\n"),
  };
}

// --- 2. New-lead alert to the assigned agent / team ------------------------
export function agentNotificationEmail({ lead, agent, siteUrl, submittedAt }) {
  const rows = [
    ["Name", `${lead.first_name || ""} ${lead.last_name || ""}`.trim()],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["State", lead.state],
    ["Age", lead.age_range],
    ["Top goal", lead.goal],
    ["TCPA consent", lead.consent === "yes" ? "Yes (checked on form)" : "No"],
    ["Assigned to", agent.name],
    ["Submitted", submittedAt],
    ["Source", [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ") || "direct"],
    ["Landing page", lead.landing_page],
  ];
  const table = rows
    .map(([k, v]) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #e6e9ec;color:${MUTED};font-size:14px;white-space:nowrap" valign="top">${esc(k)}</td><td style="padding:8px 10px;border-bottom:1px solid #e6e9ec;font-weight:600;color:${NAVY};font-size:14px">${esc(v || "—")}</td></tr>`)
    .join("");
  const body = `
    <h1 style="margin:0 0 6px;font-size:22px;color:${NAVY};font-weight:800">New IUL lead: ${esc(lead.first_name)} ${esc(lead.last_name)} (${esc(lead.state)})</h1>
    <p style="margin:0 0 18px;color:${MUTED}">They’ve been emailed your contact info and told to expect outreach within one business day.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${table}</table>
    <p style="margin:22px 0 0">${lead.phone ? `<a href="tel:${esc(String(lead.phone).replace(/[^\d+]/g, ""))}" style="color:${TEAL};font-weight:700">Call now</a> · ` : ""}<a href="mailto:${esc(lead.email)}" style="color:${TEAL};font-weight:700">Email</a></p>`;
  return {
    subject: `New IUL lead: ${lead.first_name || ""} ${lead.last_name || ""} (${lead.state || "?"}) → ${agent.name}`,
    html: layout({ siteUrl, preheader: `New lead from the IUL landing page`, body }),
    text: rows.map(([k, v]) => `${k}: ${v || "-"}`).join("\n"),
  };
}

// --- 3. Guide delivery ------------------------------------------------------
export function guideEmail({ lead, siteUrl }) {
  const first = esc(lead.first_name || "there");
  const guideUrl = abs(siteUrl, "/guide/");
  const pdfUrl = abs(siteUrl, "/guide/retireflow-iul-playbook.pdf");
  const reviewUrl = abs(siteUrl, "/#get-started");
  const body = `
    <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:${NAVY};font-weight:800">Here’s your free guide, ${first} 📘</h1>
    <p style="margin:0 0 20px"><strong>The IUL Retirement Playbook</strong> walks you through how Indexed Universal Life really works, including the caps, the costs, how tax-advantaged income is accessed, and the 7 questions to ask before you buy.</p>
    ${button(pdfUrl, "Download the PDF")}
    <p style="margin:12px 0 0;font-size:14px;color:${MUTED}">Prefer to read online? <a href="${esc(guideUrl)}" style="color:${TEAL};font-weight:700">Open the web version</a>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:30px;background:${MINT};border-radius:12px"><tr><td style="padding:22px">
      <p style="margin:0 0 6px;font-weight:800;color:${NAVY};font-size:17px">Want to see your own numbers?</p>
      <p style="margin:0 0 16px;font-size:15px">A licensed professional in your state can build a personalized illustration for your age, budget, and goals. No cost, no obligation.</p>
      ${button(reviewUrl, "Get My Free Review")}
    </td></tr></table>
    <p style="margin:28px 0 0">To your retirement,<br><strong>The RetireFlow Team</strong></p>`;
  return {
    subject: "Your free IUL Retirement Playbook is here",
    html: layout({ siteUrl, preheader: "7 questions to answer before you buy an Indexed Universal Life policy.", body }),
    text: `Here's your free guide, ${lead.first_name || "there"}!\n\nDownload the PDF: ${pdfUrl}\nRead online: ${guideUrl}\n\nWant to see your own numbers? Get a free review with a licensed professional: ${reviewUrl}\n\n- The RetireFlow Team`,
  };
}

// --- 4. New guide-download alert to you -------------------------------------
export function guideAlertEmail({ lead, siteUrl, submittedAt }) {
  const rows = [
    ["Name", lead.first_name],
    ["Email", lead.email],
    ["Submitted", submittedAt],
    ["Source", [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ") || "direct"],
    ["Landing page", lead.landing_page],
  ];
  const table = rows
    .map(([k, v]) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #e6e9ec;color:${MUTED};font-size:14px;white-space:nowrap" valign="top">${esc(k)}</td><td style="padding:8px 10px;border-bottom:1px solid #e6e9ec;font-weight:600;color:${NAVY};font-size:14px">${esc(v || "—")}</td></tr>`)
    .join("");
  const body = `
    <h1 style="margin:0 0 6px;font-size:22px;color:${NAVY};font-weight:800">New guide download: ${esc(lead.first_name || lead.email)}</h1>
    <p style="margin:0 0 18px;color:${MUTED}">They downloaded <em>The IUL Retirement Playbook</em> and were emailed a copy with an invitation to book a free review. This is a warm lead to follow up with by email.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${table}</table>
    <p style="margin:22px 0 0"><a href="mailto:${esc(lead.email)}" style="color:${TEAL};font-weight:700">Email ${esc(lead.first_name || "them")}</a></p>`;
  return {
    subject: `New guide download: ${lead.first_name || ""} <${lead.email}>`.replace(/\s+</, " <"),
    html: layout({ siteUrl, preheader: "Someone just downloaded the IUL Retirement Playbook", body }),
    text: rows.map(([k, v]) => `${k}: ${v || "-"}`).join("\n"),
  };
}
