# RetireFlow: IUL Landing Page

A lead-generation landing page for Indexed Universal Life (IUL), built for **Netlify** with confirmation emails sent through **Resend**. It's plain HTML, CSS, and JS, with no build step.

## What's included

| Path | What it is |
|---|---|
| `public/index.html` | The landing page: hero + consultation form, education, comparison table, free-guide opt-in, FAQ, disclosures |
| `public/thank-you/` | Shown after the consultation form is submitted |
| `public/guide/` | **The IUL Retirement Playbook**, the free guide (web version) |
| `public/guide/retireflow-iul-playbook.pdf` | Branded 10-page PDF of the guide. **Downloads automatically** after either form is submitted |
| `public/privacy/` | Privacy policy **template**. Fill in the `[BRACKETS]` or point links to your existing policy |
| `netlify/functions/submission-created.mjs` | Runs automatically on every verified form submission and sends the emails |
| `netlify/lib/agents.mjs` | **Your licensed agents and the states they cover.** Edit this file |
| `netlify/lib/emails.mjs` | Email templates (lead confirmation, new-lead alert, guide delivery, guide-download alert) |
| `google-sheets/Code.gs` | Google Apps Script that adds every lead to your Google Sheet |

Brand colors (`#041C39` navy, `#077B82` teal, `#F5FAF6` background) and the Manrope font come from getretireflow.com. They're defined once at the top of `public/assets/styles.css`.

## How the flow works

1. **Consultation form** (`iul-consultation`) → Netlify Forms stores the lead and filters spam. The visitor lands on `/thank-you/` and **the PDF guide downloads automatically**.
2. **Guide form** (`guide-request`) → the visitor lands on `/guide/` and **the PDF downloads automatically**. A "click here" link is there in case the browser blocks it.
3. For every lead, Netlify triggers `submission-created`, which:
   - **adds a row to your Google Sheet** with name, email, phone, state, age, goal, consent, assigned agent, a **Status** dropdown, a Notes column, and UTM/ad source,
   - **emails you a new-lead alert** (`LEADS_NOTIFY_EMAIL`). For consultations, the assigned agent gets it too. Hitting reply emails the lead directly,
   - emails the lead: the agent introduction ("Meet your licensed RetireFlow professional") or the guide delivery.

The sheet and the emails run independently: if one isn't set up yet or fails, the other still works. Every lead is also kept in **Netlify → Forms** as a backup, and you can export it as CSV.

## Setup (about 15 minutes)

### 1. Resend
1. In Resend → **Domains**, add and verify `getretireflow.com` (or a subdomain like `mail.getretireflow.com`) by adding the DNS records it gives you.
2. Under **API Keys**, create a key with "Sending access".

### 2. Netlify
1. **Add new site → Import from Git** → pick this repo. Leave the build command empty. The publish directory (`public`) is already set in `netlify.toml`.
2. **Site configuration → Environment variables**, add:

   | Variable | Example |
   |---|---|
   | `RESEND_API_KEY` | `re_...` |
   | `EMAIL_FROM` | `RetireFlow <hello@getretireflow.com>` (must use your verified domain) |
   | `LEADS_NOTIFY_EMAIL` | `you@getretireflow.com` (comma-separate several addresses) |
   | `EMAIL_REPLY_TO` | *(optional)* reply-to for guide emails |
   | `SITE_URL` | *(optional)* e.g. `https://iul.getretireflow.com`. Defaults to the Netlify URL |

3. **Forms → Enable form detection**, then **redeploy** so Netlify finds the two forms.
4. *(Optional)* **Domain management**: add a custom domain like `iul.getretireflow.com`.

### 3. Google Sheet (leads log)
1. Open the **RetireFlow IUL Leads** sheet (or create any blank Google Sheet) → **Extensions → Apps Script**.
2. Replace everything in `Code.gs` with the contents of [`google-sheets/Code.gs`](google-sheets/Code.gs), change `SECRET` to a long random string, and click **Save**.
3. In the function dropdown, choose **`setup`** → **Run** → approve the permissions. This formats the "Leads" tab (navy header, frozen row, Status dropdown).
4. **Deploy → New deployment →** gear icon **→ Web app**. Set *Execute as*: **Me** and *Who has access*: **Anyone**, then **Deploy**. Copy the **Web app URL**.
5. In Netlify, add these environment variables, then redeploy:

   | Variable | Value |
   |---|---|
   | `GOOGLE_SHEETS_WEBHOOK_URL` | the Web app URL (`https://script.google.com/macros/s/.../exec`) |
   | `GOOGLE_SHEETS_SECRET` | the same `SECRET` you put in the script |

To check the connection, run **`testInsert`** in the Apps Script editor. A "Test Lead" row should appear (delete it afterwards). If you edit the script later, use **Deploy → Manage deployments → Edit → New version** so the URL doesn't change.

### 4. Add your agents
Edit `netlify/lib/agents.mjs`. For each agent, add their name, NPN, email, phone, photo, optional booking link, and licensed states. Until you do, every lead is assigned to "The RetireFlow Team" at `team@getretireflow.com`. Change that default email too.

### 5. Test it
Submit both forms on the live site with your own email. Check that:
- the PDF downloads,
- you get the lead's confirmation email **and** the new-lead alert,
- a new row appears in the Google Sheet.

If something's missing, check **Netlify → Logs → Functions → submission-created**, the **Resend → Emails** log, and **Apps Script → Executions**.

## Before you launch: compliance checklist
Insurance marketing is regulated. Have your compliance or legal contact (or your IMO/carrier) review:
- [ ] The TCPA consent language on the form (it's in `public/index.html`)
- [ ] The footnoted disclosures in the page footer and the guide
- [ ] The privacy policy (`public/privacy/`)
- [ ] Any state-specific advertising rules for life insurance in the states you market in
- [ ] Your business/agency name and license info in the footer, if required in your states

The copy avoids promising guaranteed returns or "tax-free" income without qualification, and it labels the chart as hypothetical. Keep that in mind when you edit.

## Local development
```bash
npm i -g netlify-cli
netlify dev          # serves the site and functions at http://localhost:8888
npm test             # unit tests for the email function (Resend is mocked)
```

To regenerate the guide PDF after editing `public/guide/index.html`:
```bash
npm install && npm i --no-save playwright && npx playwright install chromium
npm run pdf
```
