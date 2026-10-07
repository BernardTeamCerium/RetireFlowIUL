# RetireFlow: IUL Landing Page

A lead-generation landing page for Indexed Universal Life (IUL), built for **Netlify** with confirmation emails sent through **Resend**. It's plain HTML, CSS, and JS, with no build step.

## What's included

| Path | What it is |
|---|---|
| `public/index.html` | The landing page: hero + consultation form, education, comparison table, free-guide opt-in, FAQ, disclosures |
| `public/thank-you/` | Shown after the consultation form is submitted |
| `public/guide/` | **The IUL Retirement Playbook**, the free guide (web version) |
| `public/guide/retireflow-iul-playbook.pdf` | PDF version of the guide (linked in emails) |
| `public/privacy/` | Privacy policy **template**. Fill in the `[BRACKETS]` or point links to your existing policy |
| `netlify/functions/submission-created.mjs` | Runs automatically on every verified form submission and sends the emails |
| `netlify/lib/agents.mjs` | **Your licensed agents and the states they cover.** Edit this file |
| `netlify/lib/emails.mjs` | Email templates (confirmation, agent alert, guide delivery) |

Brand colors (`#041C39` navy, `#077B82` teal, `#F5FAF6` background) and the Manrope font come from getretireflow.com. They're defined once at the top of `public/assets/styles.css`.

## How the flow works

1. **Consultation form** (`iul-consultation`) → Netlify Forms stores the lead and filters spam. Then the visitor goes to `/thank-you/`.
2. Netlify triggers `submission-created`, which:
   - picks a licensed agent for the lead's **state** (from `agents.mjs`),
   - emails the lead: **"Meet your licensed RetireFlow professional"**, with the agent's name, NPN, phone, email, optional booking link, and the free guide,
   - emails the **agent** (CC'd to `LEADS_NOTIFY_EMAIL`) a new-lead alert with all the details. Replying goes straight to the lead.
3. **Guide form** (`guide-request`) → the visitor goes to `/guide/`. They also get a "Here's your free guide" email with the PDF and a CTA to book a review.

Every lead is also saved in **Netlify → Forms**, and you can export it as CSV. UTM parameters (`utm_source`, `utm_campaign`, and so on) are captured automatically for ad tracking.

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

### 3. Add your agents
Edit `netlify/lib/agents.mjs`. For each agent, add their name, NPN, email, phone, photo, optional booking link, and licensed states. Until you do, every lead is assigned to "The RetireFlow Team" at `team@getretireflow.com`. Change that default email too.

### 4. Test it
Submit the form on the live site with your own email. You should get the confirmation, and the agent/notify address should get the lead alert. If not, check **Netlify → Logs → Functions → submission-created** and the **Resend → Emails** log.

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
npm i -D playwright && npx playwright install chromium
npm run pdf
```
