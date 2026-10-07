import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { handler } from "../netlify/functions/submission-created.mjs";
import { assignAgent } from "../netlify/lib/agents.mjs";

let calls;
beforeEach(() => {
  calls = [];
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "RetireFlow <hello@getretireflow.com>";
  process.env.LEADS_NOTIFY_EMAIL = "owner@getretireflow.com";
  process.env.SITE_URL = "https://iul.example.com";
  globalThis.fetch = async (url, init) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ id: "email_" + calls.length }), { status: 200 });
  };
});

const event = (form_name, data) => ({ body: JSON.stringify({ payload: { id: "sub123", form_name, created_at: "2026-10-07T12:00:00Z", data } }) });

test("consultation sends confirmation to lead and alert to agent", async () => {
  const res = await handler(event("iul-consultation", {
    first_name: "Pat", last_name: "Lee", email: "pat@example.com", phone: "(555) 555-1212",
    state: "TX", age_range: "50–59", goal: "Tax-free retirement income", consent: "yes",
  }));
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 2);
  const [confirm, alert] = calls;
  assert.equal(confirm.url, "https://api.resend.com/emails");
  assert.equal(confirm.headers.Authorization, "Bearer re_test");
  assert.equal(confirm.headers["Idempotency-Key"], "sub123-confirm");
  assert.deepEqual(confirm.body.to, ["pat@example.com"]);
  assert.match(confirm.body.subject, /Pat, meet your licensed RetireFlow professional/);
  assert.match(confirm.body.html, /https:\/\/iul\.example\.com\/guide\//);
  assert.deepEqual(alert.body.to, ["team@getretireflow.com"]);
  assert.deepEqual(alert.body.cc, ["owner@getretireflow.com"]);
  assert.equal(alert.body.reply_to, "pat@example.com");
  assert.match(alert.body.html, /Tax-free retirement income/);
});

test("user input is HTML-escaped in emails", async () => {
  await handler(event("iul-consultation", { first_name: "<script>x</script>", email: "a@b.co", state: "CA" }));
  for (const c of calls) assert.doesNotMatch(c.body.html, /<script>x<\/script>/);
});

test("guide request sends guide email and team alert", async () => {
  const res = await handler(event("guide-request", { first_name: "Sam", email: "sam@example.com" }));
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[0].body.html, /retireflow-iul-playbook\.pdf/);
  assert.deepEqual(calls[1].body.to, ["owner@getretireflow.com"]);
});

test("missing config returns 500 and sends nothing", async () => {
  delete process.env.RESEND_API_KEY;
  const res = await handler(event("guide-request", { email: "x@y.co" }));
  assert.equal(res.statusCode, 500);
  assert.equal(calls.length, 0);
});

test("Resend failure is reported", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "bad" }), { status: 422 });
  const res = await handler(event("guide-request", { email: "x@y.co" }));
  assert.equal(res.statusCode, 500);
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
