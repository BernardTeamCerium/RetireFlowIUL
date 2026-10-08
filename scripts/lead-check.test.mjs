import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { handler } from "../netlify/functions/lead-check.mjs";

const URL_OK = "https://script.google.com/macros/s/AKfyTEST/exec";
let reply;
beforeEach(() => {
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = URL_OK;
  process.env.GOOGLE_SHEETS_SECRET = "s3cret";
  globalThis.fetch = async (url, init) => {
    assert.deepEqual(JSON.parse(init.body), { secret: "s3cret", ping: true });
    return new Response(reply.body, { status: reply.status || 200 });
  };
});
const body = async () => (await handler()).body;

test("connected", async () => {
  reply = { body: JSON.stringify({ ok: true, pong: true, sheet: "Leads" }) };
  assert.match(await body(), /Connected\. The password matches.*Leads/);
});
test("password mismatch", async () => {
  reply = { body: JSON.stringify({ ok: false, error: "unauthorized" }) };
  assert.match(await body(), /password doesn’t match/);
});
test("access not set to Anyone (Google sign-in page)", async () => {
  reply = { body: "<html>Sign in - Google Accounts accounts.google.com</html>" };
  assert.match(await body(), /Who has access/);
});
test("old script version", async () => {
  reply = { body: JSON.stringify({ ok: true, row: 5 }) };
  assert.match(await body(), /older version/);
});
test("wrong URL format and missing settings", async () => {
  process.env.GOOGLE_SHEETS_WEBHOOK_URL = "https://script.google.com/home/projects/abc/edit";
  assert.match(await body(), /doesn’t look right/);
  delete process.env.GOOGLE_SHEETS_SECRET;
  assert.match(await body(), /missing in Netlify/);
});
test("never reveals secret values", async () => {
  reply = { body: JSON.stringify({ ok: true, pong: true, sheet: "Leads" }) };
  const html = await body();
  assert.doesNotMatch(html, /s3cret|AKfyTEST/);
});
