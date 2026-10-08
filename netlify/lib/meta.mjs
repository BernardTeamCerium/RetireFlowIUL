// Meta Conversions API (server-side conversion tracking).
// Sends the same event the browser Pixel fires, with the same event_id, so
// Meta counts each lead once even when the Pixel is blocked (ad blockers,
// iOS privacy features). Personal data is SHA-256 hashed before it leaves
// the server, as Meta requires. Only contact fields used for matching are
// sent; financial details (age, goals) are never shared with Meta.

import { createHash } from "node:crypto";

const GRAPH_VERSION = "v23.0";

const EVENTS = {
  "iul-consultation": { name: "Lead", content_name: "IUL Free Review" },
  "guide-request": { name: "CompleteRegistration", content_name: "IUL Retirement Playbook" },
};

const sha256 = (v) => createHash("sha256").update(v).digest("hex");

function hashed(value, normalize = (s) => s.trim().toLowerCase()) {
  if (value === undefined || value === null || String(value).trim() === "") return undefined;
  const n = normalize(String(value));
  return n ? [sha256(n)] : undefined;
}

function normalizePhone(p) {
  const digits = p.replace(/\D/g, "");
  return digits.length === 10 ? "1" + digits : digits; // assume US numbers
}

export function buildMetaEvent({ formName, lead, createdAt }) {
  const ev = EVENTS[formName];
  if (!ev) return null;
  const user_data = {
    em: hashed(lead.email),
    ph: hashed(lead.phone, normalizePhone),
    fn: hashed(lead.first_name, (s) => s.trim().toLowerCase().replace(/[^\p{L}]/gu, "")),
    ln: hashed(lead.last_name, (s) => s.trim().toLowerCase().replace(/[^\p{L}]/gu, "")),
    st: hashed(lead.state),
    country: [sha256("us")],
    external_id: hashed(lead.email),
    fbp: lead.fbp || undefined,
    fbc: lead.fbc || undefined,
    client_ip_address: lead.ip || undefined,
    client_user_agent: lead.user_agent || undefined,
  };
  Object.keys(user_data).forEach((k) => user_data[k] === undefined && delete user_data[k]);
  return {
    event_name: ev.name,
    event_time: Math.floor(new Date(createdAt || Date.now()).getTime() / 1000),
    event_id: lead.meta_event_id || undefined,
    action_source: "website",
    event_source_url: lead.landing_page || undefined,
    user_data,
    custom_data: { content_name: ev.content_name, content_category: "IUL" },
  };
}

export async function sendMetaEvent(event, { pixelId, accessToken, testEventCode }) {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event], ...(testEventCode ? { test_event_code: testEventCode } : {}) }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Meta CAPI ${res.status}: ${JSON.stringify(out.error || out)}`);
  return out;
}
