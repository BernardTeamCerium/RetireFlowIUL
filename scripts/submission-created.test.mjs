import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { handler } from "../netlify/functions/submission-created.mjs";
import { assignAgent } from "../netlify/lib/agents.mjs";

const SHEET_URL = "https://script.google.com/macros/s/abc/exec";
let emails, sheetRows, sheetResponse, metaCalls;

beforeEach(() => {
  emails = [];
  sheetRows = [];
  sheetResponse = { ok: true };
  metaCalls = [];
  delete process.env.META_PIXEL_ID;
  delete process.env.META_CAPI_TOKEN;
  Object.assign(process.env, {
    RESEND_API_KEY: "re_test",
    EMAIL_FROM: "RetireFlow <hello@getretireflow.com>",
    LEADS_NOTIFY_EMAIL: "owner@getretireflow.com",
    SITE_URL: "https://iul.example.com",
    GOOGLE_SHEETS_WEBHOOK_URL: SHEET_URL,
    GOOGLE_SHEETS_SECRET: "s3cret",
  });
  globalThis.fetch = async (url, init) => {
    if (url === SHEET_URL) {
      sheetRows.push(JSON.parse(init.body));
      return new Response(JSON.stringify(sheetResponse), { status: 200 });
    }
    if (url.startsWith("https://graph.facebook.com/")) {
      metaCalls.push({ url, body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
    }
    emails.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ id: "email_" + emails.length }), { status: 200 });
  };
});

const event = (form_name, data) => ({ body: JSON.stringify({ payload: { id: "sub123", form_name, created_at: "2026-10-07T12:00:00Z", data } }) });
const consult = {
  first_name: "Pat", last_name: "Lee", email: "pat@example.com", phone: "(555) 555-1212",
  state: "TX", age_range: "50–59", goal: "Tax-free retirement income", consent: "yes", consent_version: "2026-10-08", utm_source: "facebook",
};

test("consultation: confirmation to lead, alert to agent + notify, row in sheet", async () => {
  const res = await handler(event("iul-consultation", consult));
  assert.equal(res.statusCode, 200);
  assert.equal(emails.length, 2);
  const [confirm, alert] = emails;
  assert.equal(confirm.url, "https://api.resend.com/emails");
  assert.equal(confirm.headers.Authorization, "Bearer re_test");
  assert.equal(confirm.headers["Idempotency-Key"], "sub123-confirm");
  assert.deepEqual(confirm.body.to, ["pat@example.com"]);
  assert.match(confirm.body.subject, /Pat, here’s what happens next/);
  assert.deepEqual(alert.body.to, ["team@getretireflow.com"]);
  assert.deepEqual(alert.body.cc, ["owner@getretireflow.com"]);
  assert.equal(alert.body.reply_to, "pat@example.com");

  assert.equal(sheetRows.length, 1);
  const row = sheetRows[0];
  assert.equal(row.secret, "s3cret");
  assert.equal(row.lead_type, "Consultation");
  assert.equal(row.submission_id, "sub123");
  assert.equal(row.phone, "(555) 555-1212");
  assert.equal(row.consent, "Yes: call, text & email (form v2026-10-08)");
  assert.equal(row.agent_name, "The RetireFlow Team");
  assert.equal(row.utm_source, "facebook");
});

test("lead confirmation is generic: no agent details, no booking, not-spam note", async () => {
  await handler(event("iul-consultation", consult));
  const confirm = emails[0].body;
  for (const content of [confirm.html, confirm.text]) {
    assert.match(content, /partnered licensed/);
    assert.match(content, /not a spam call/);
    assert.doesNotMatch(content, /team@getretireflow\.com|RetireFlow Team<\/div>|NPN|Schedule My Meeting|calendly|Book (My|a)/i);
  }
  assert.equal(confirm.reply_to, undefined);
});

test("guide request: guide email, branded alert to notify, row in sheet", async () => {
  const res = await handler(event("guide-request", { first_name: "Sam", email: "sam@example.com" }));
  assert.equal(res.statusCode, 200);
  assert.equal(emails.length, 2);
  assert.match(emails[0].body.html, /retireflow-iul-playbook\.pdf/);
  assert.deepEqual(emails[1].body.to, ["owner@getretireflow.com"]);
  assert.match(emails[1].body.subject, /New guide download: Sam <sam@example.com>/);
  assert.match(emails[1].body.html, /IUL Retirement Playbook/);
  assert.equal(sheetRows[0].lead_type, "Guide Download");
  assert.equal(sheetRows[0].agent_name, undefined);
});

test("user input is HTML-escaped in emails", async () => {
  await handler(event("iul-consultation", { first_name: "<script>x</script>", email: "a@b.co", state: "CA" }));
  for (const c of emails) assert.doesNotMatch(c.body.html, /<script>x<\/script>/);
});

test("sheet still gets the lead when email is not configured", async () => {
  delete process.env.RESEND_API_KEY;
  const res = await handler(event("guide-request", { email: "x@y.co" }));
  assert.equal(res.statusCode, 200);
  assert.equal(emails.length, 0);
  assert.equal(sheetRows.length, 1);
});

test("emails still send when the sheet is not configured", async () => {
  delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const res = await handler(event("iul-consultation", consult));
  assert.equal(res.statusCode, 200);
  assert.equal(emails.length, 2);
  assert.equal(sheetRows.length, 0);
});

test("nothing configured returns 500", async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  const res = await handler(event("guide-request", { email: "x@y.co" }));
  assert.equal(res.statusCode, 500);
});

test("sheet rejection (bad secret) is reported but emails still go out", async () => {
  sheetResponse = { ok: false, error: "unauthorized" };
  const res = await handler(event("iul-consultation", consult));
  assert.equal(res.statusCode, 500);
  assert.match(res.body, /1 of 3 tasks failed/);
  assert.equal(emails.length, 2);
});

test("Resend failure is reported", async () => {
  delete process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "bad" }), { status: 422 });
  const res = await handler(event("guide-request", { email: "x@y.co" }));
  assert.equal(res.statusCode, 500);
});

test("unknown forms are ignored", async () => {
  const res = await handler(event("other-form", { email: "x@y.co" }));
  assert.equal(res.statusCode, 200);
  assert.equal(emails.length + sheetRows.length, 0);
});

test("Meta CAPI: Lead event with hashed contact data and shared event_id", async () => {
  process.env.META_PIXEL_ID = "999";
  process.env.META_CAPI_TOKEN = "tok";
  const res = await handler(event("iul-consultation", { ...consult, meta_event_id: "evt-1", fbp: "fb.1.1.2", fbc: "fb.1.3.abc", ip: "1.2.3.4", user_agent: "UA", landing_page: "https://iul.example.com/?utm_source=fb" }));
  assert.equal(res.statusCode, 200);
  assert.equal(metaCalls.length, 1);
  assert.match(metaCalls[0].url, /graph\.facebook\.com\/v\d+\.0\/999\/events\?access_token=tok/);
  const ev = metaCalls[0].body.data[0];
  assert.equal(ev.event_name, "Lead");
  assert.equal(ev.event_id, "evt-1");
  assert.equal(ev.action_source, "website");
  assert.equal(ev.event_time, 1791374400);
  const sha = (v) => createHash("sha256").update(v).digest("hex");
  assert.deepEqual(ev.user_data.em, [sha("pat@example.com")]);
  assert.deepEqual(ev.user_data.ph, [sha("15555551212")]);
  assert.deepEqual(ev.user_data.fn, [sha("pat")]);
  assert.deepEqual(ev.user_data.st, [sha("tx")]);
  assert.equal(ev.user_data.fbc, "fb.1.3.abc");
  assert.equal(ev.user_data.client_ip_address, "1.2.3.4");
  const json = JSON.stringify(metaCalls[0].body);
  assert.doesNotMatch(json, /pat@example\.com|Tax-free|50–59/); // no raw PII or financial details
});

test("Meta CAPI: guide request sends CompleteRegistration; skipped when not configured", async () => {
  await handler(event("guide-request", { first_name: "Sam", email: "sam@example.com" }));
  assert.equal(metaCalls.length, 0);
  process.env.META_PIXEL_ID = "999";
  process.env.META_CAPI_TOKEN = "tok";
  await handler(event("guide-request", { first_name: "Sam", email: "sam@example.com" }));
  assert.equal(metaCalls[0].body.data[0].event_name, "CompleteRegistration");
});

test("agent routing prefers state-licensed agents and is stable", () => {
  const agents = [
    { id: "d", states: ["*"] },
    { id: "tx1", states: ["TX"] },
    { id: "tx2", states: ["TX", "FL"] },
  ];
  assert.equal(assignAgent("NY", "a@b.co", agents).id, "d");
  const a = assignAgent("tx", "lead@x.com", agents).id;
  assert.ok(["tx1", "tx2"].includes(a));
  assert.equal(assignAgent("TX", "LEAD@x.com", agents).id, a);
  assert.equal(assignAgent("FL", "z@z.z", agents).id, "tx2");
});
