import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { handler } from "../netlify/functions/submission-created.mjs";
import { assignAgent } from "../netlify/lib/agents.mjs";

const SHEET_URL = "https://script.google.com/macros/s/abc/exec";
let emails, sheetRows, sheetResponse;

beforeEach(() => {
  emails = [];
  sheetRows = [];
  sheetResponse = { ok: true };
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
  assert.match(confirm.body.subject, /Pat, meet your licensed RetireFlow professional/);
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
