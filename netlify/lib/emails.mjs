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

function layout({ siteUrl, preheader, body, internal = false }) {
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
    ${internal
      ? `<tr><td style="padding:22px 16px;font-family:Manrope,Arial,sans-serif;font-size:11px;line-height:1.55;color:${MUTED};text-align:center">Internal lead alert from your RetireFlow landing page. Contains personal information; please don’t forward outside your team.</td></tr>`
      : `<tr><td style="padding:22px 16px;font-family:Manrope,Arial,sans-serif;font-size:11px;line-height:1.55;color:${MUTED};text-align:center">
      You’re receiving this because you requested information at ${esc(siteUrl.replace(/^https?:\/\//, ""))}.<br>
      RetireFlow connects consumers with independent licensed insurance professionals. Indexed Universal Life is a life insurance product, not a stock market investment. Policy loans and withdrawals reduce cash value and death benefit and may have tax consequences. This is not tax or legal advice.<br><br>
      Don’t want these emails? Just reply “unsubscribe.”
    </td></tr>`}
  </table>
</td></tr></table></body></html>`;
}

// --- 1. Lead confirmation: "Here's what happens next" ----------------------
function stepRow(n, title, text) {
  return `<tr>
    <td width="44" valign="top" style="padding:0 14px 18px 0"><div style="width:34px;height:34px;line-height:34px;border-radius:50%;background:${NAVY};color:#7fd8cf;text-align:center;font-weight:800;font-size:15px;font-family:Manrope,Arial,sans-serif">${n}</div></td>
    <td valign="top" style="padding:4px 0 18px;font-family:Manrope,Arial,sans-serif;font-size:15px;line-height:1.55"><strong style="color:${NAVY};font-size:16px">${title}</strong><br>${text}</td>
  </tr>`;
}

export function leadConfirmationEmail({ lead, siteUrl }) {
  const first = esc(lead.first_name || "there");
  const guideUrl = abs(siteUrl, "/guide/");
  const pdfUrl = abs(siteUrl, "/guide/retireflow-iul-playbook.pdf");

  const body = `
    <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:${NAVY};font-weight:800">You’re all set, ${first}! Here’s what happens next.</h1>
    <p style="margin:0 0 22px">Thank you for requesting your free IUL review. We’re connecting you with one of our <strong>partnered licensed insurance agents</strong> in ${lead.state ? `<strong>${esc(lead.state)}</strong>` : "your state"}, who will walk you through how an Indexed Universal Life policy works and whether it could fit your retirement plan.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 26px;background:${MINT};border-radius:12px;border-left:5px solid ${TEAL}"><tr><td style="padding:18px 20px;font-family:Manrope,Arial,sans-serif;font-size:15px;line-height:1.55">
      <strong style="color:${NAVY};font-size:16px">📞 Please answer when we call</strong><br>
      Your agent may call or text from a number you don’t recognize. <strong>It’s not a spam call.</strong> It’s your RetireFlow partnered agent following up on your request.
    </td></tr></table>

    <p style="margin:0 0 14px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;font-weight:800;color:${TEAL}">Your next steps</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${stepRow(1, "Watch for a call, text, or email", "One of our partnered licensed agents will reach out, usually within one business day, to set up a time that works for you.")}
      ${stepRow(2, "Have your educational meeting", `It’s free and takes about 20–30 minutes by phone or video. You’ll learn how IULs work, including the upside, the trade-offs, and the costs, and talk through your goals${lead.goal ? ` (you told us: <em>${esc(lead.goal)}</em>)` : ""}. It’s <strong>strictly informational, not a sales call</strong>.`)}
      ${stepRow(3, "Decide what’s right for you, on your timeline", "There’s <strong>no cost and no obligation to buy anything</strong>. Take whatever time you need, ask every question, and only move forward if it truly makes sense for you.")}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 26px;border:1px solid #e6e9ec;border-radius:12px"><tr><td style="padding:20px 22px;font-family:Manrope,Arial,sans-serif;font-size:15px;line-height:1.6">
      <strong style="color:${NAVY};font-size:16px">To get the most from your meeting, it helps to know:</strong>
      <ul style="margin:10px 0 0;padding-left:20px">
        <li>Roughly what you have saved for retirement today (401(k), IRA, savings)</li>
        <li>About how much you could comfortably set aside each month</li>
        <li>When you’d like to retire, and what matters most to you</li>
      </ul>
      <div style="margin-top:8px;color:${MUTED};font-size:14px">Ballpark numbers are perfectly fine. Nothing needs to be exact.</div>
    </td></tr></table>

    <p style="margin:0 0 12px"><strong style="color:${NAVY}">While you wait</strong>, read your free guide, <em>The IUL Retirement Playbook</em>. It explains caps, floors, costs, and the 7 questions to ask before you buy.</p>
    ${button(pdfUrl, "Download the Free Playbook")}
    <p style="margin:10px 0 0;font-size:14px;color:${MUTED}">Or <a href="${esc(guideUrl)}" style="color:${TEAL};font-weight:700">read it online</a>.</p>

    <p style="margin:28px 0 0">Questions in the meantime? Just reply to this email.</p>
    <p style="margin:18px 0 0">To your retirement,<br><strong>The RetireFlow Team</strong><br><span style="color:${MUTED};font-size:14px">Let’s plan a retirement that flows.</span></p>
    <p style="margin:24px 0 0;font-size:12px;color:${MUTED}">Changed your mind? No problem. Reply STOP to any text message to stop texts, or see the note below to stop emails.</p>`;

  return {
    subject: `${lead.first_name ? lead.first_name + ", here’s" : "Here’s"} what happens next with your free IUL review`,
    html: layout({ siteUrl, preheader: "One of our partnered licensed agents will reach out within one business day. Please answer, it’s not spam.", body }),
    text: [
      `You're all set, ${lead.first_name || "there"}! Here's what happens next.`,
      ``,
      `Thank you for requesting your free IUL review. We're connecting you with one of our partnered licensed insurance agents in ${lead.state || "your state"}.`,
      ``,
      `PLEASE ANSWER WHEN WE CALL: your agent may call or text from a number you don't recognize. It's not a spam call. It's your RetireFlow partnered agent following up on your request.`,
      ``,
      `YOUR NEXT STEPS`,
      `1. Watch for a call, text, or email. A partnered licensed agent will reach out, usually within one business day, to set up a time that works for you.`,
      `2. Have your educational meeting. It's free, about 20-30 minutes by phone or video, and strictly informational, not a sales call.`,
      `3. Decide on your timeline. There's no cost and no obligation to buy anything.`,
      ``,
      `TO PREPARE (ballpark numbers are fine): what you've saved for retirement today, what you could set aside each month, and when you'd like to retire.`,
      ``,
      `Your free guide, The IUL Retirement Playbook: ${pdfUrl}`,
      ``,
      `Questions? Just reply to this email.`,
      ``,
      `To your retirement,`,
      `The RetireFlow Team`,
      ``,
      `Changed your mind? Reply STOP to any text or "unsubscribe" to this email.`,
    ].join("\n"),
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
    ["Contact consent", lead.consent === "yes" ? `Yes: call, text & email (form v${lead.consent_version || "?"})` : "No"],
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
    <p style="margin:0 0 18px;color:${MUTED}">The lead received a generic confirmation email that doesn’t name the agent. It tells them a partnered licensed agent will reach out within one business day, possibly from an unfamiliar number, and asks them to answer.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${table}</table>
    <p style="margin:22px 0 0">${lead.phone ? `<a href="tel:${esc(String(lead.phone).replace(/[^\d+]/g, ""))}" style="color:${TEAL};font-weight:700">Call now</a> · ` : ""}<a href="mailto:${esc(lead.email)}" style="color:${TEAL};font-weight:700">Email</a></p>`;
  return {
    subject: `New IUL lead: ${lead.first_name || ""} ${lead.last_name || ""} (${lead.state || "?"}) → ${agent.name}`,
    html: layout({ siteUrl, preheader: `New lead from the IUL landing page`, body, internal: true }),
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
    ["Contact consent", lead.consent === "yes" ? `Yes: email only (form v${lead.consent_version || "?"})` : "No"],
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
    html: layout({ siteUrl, preheader: "Someone just downloaded the IUL Retirement Playbook", body, internal: true }),
    text: rows.map(([k, v]) => `${k}: ${v || "-"}`).join("\n"),
  };
}
