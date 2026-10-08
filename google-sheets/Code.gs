/**
 * RetireFlow: lead capture → Google Sheet
 *
 * Setup (one time, about 5 minutes):
 *  1. Open the "RetireFlow IUL Leads" Google Sheet → Extensions → Apps Script.
 *  2. Delete anything in Code.gs, paste this whole file, and click Save.
 *  3. Change SECRET below to a long random string (letters and numbers).
 *  4. Click Deploy → New deployment → gear icon → "Web app".
 *       Execute as:      Me
 *       Who has access:  Anyone
 *     Click Deploy, approve the permissions, and copy the Web app URL.
 *  5. In Netlify → Site configuration → Environment variables, add:
 *       GOOGLE_SHEETS_WEBHOOK_URL = (the Web app URL)
 *       GOOGLE_SHEETS_SECRET      = (the same SECRET as below)
 *     Then redeploy the site.
 *
 * "Anyone" only means the URL can receive data. Requests without the
 * correct SECRET are rejected, and nobody can read your sheet through it.
 *
 * If you edit this script later, use Deploy → Manage deployments → Edit →
 * Version: New version, so the URL stays the same.
 */

const SECRET = "CHANGE-ME-to-a-long-random-string";
const SHEET_NAME = "Leads";

const HEADERS = [
  "Received (ET)", "Lead Type", "First Name", "Last Name", "Email", "Phone",
  "State", "Age", "Top Goal", "Contact Consent", "Assigned Agent", "Agent Email",
  "Status", "Notes",
  "UTM Source", "UTM Medium", "UTM Campaign", "UTM Content", "UTM Term",
  "Landing Page", "Submission ID",
];
const STATUSES = ["New", "Contacted", "Appointment Set", "Illustration Sent", "Application", "Issued", "Not Interested", "Bad Contact Info"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const lead = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (lead.secret !== SECRET) return json_({ ok: false, error: "unauthorized" });

    const sheet = getSheet_();
    const idCol = HEADERS.indexOf("Submission ID") + 1;

    // Skip duplicates (e.g. a retried delivery).
    if (lead.submission_id && sheet.getLastRow() > 1) {
      const found = sheet.getRange(2, idCol, sheet.getLastRow() - 1, 1)
        .createTextFinder(String(lead.submission_id)).matchEntireCell(true).findNext();
      if (found) return json_({ ok: true, duplicate: true });
    }

    const received = lead.created_at ? new Date(lead.created_at) : new Date();
    const row = [
      Utilities.formatDate(received, "America/New_York", "yyyy-MM-dd h:mm a"),
      lead.lead_type, lead.first_name, lead.last_name, lead.email, lead.phone,
      lead.state, lead.age_range, lead.goal, lead.consent === true ? "Yes" : (lead.consent || ""),
      lead.agent_name, lead.agent_email,
      "New", "",
      lead.utm_source, lead.utm_medium, lead.utm_campaign, lead.utm_content, lead.utm_term,
      lead.landing_page, lead.submission_id,
    ].map(clean_);

    sheet.appendRow(row);
    return json_({ ok: true, row: sheet.getLastRow() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Handy for checking the deployment URL in a browser.
function doGet() {
  return json_({ ok: true, service: "RetireFlow lead sheet" });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // Reuse an empty first tab (e.g. "Sheet1") or create a new one.
    const first = ss.getSheets()[0];
    sheet = first.getLastRow() <= 1 ? first.setName(SHEET_NAME) : ss.insertSheet(SHEET_NAME, 0);
  }
  if (sheet.getRange(1, 1).getValue() !== HEADERS[0]) setupSheet_(sheet);
  return sheet;
}

function setupSheet_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight("bold").setFontColor("#ffffff").setBackground("#041c39");
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, HEADERS.length, 140);
  sheet.setColumnWidth(HEADERS.indexOf("Email") + 1, 220);
  sheet.setColumnWidth(HEADERS.indexOf("Top Goal") + 1, 240);
  sheet.setColumnWidth(HEADERS.indexOf("Notes") + 1, 260);

  // Status dropdown so you can track each lead through the pipeline.
  const statusCol = HEADERS.indexOf("Status") + 1;
  sheet.getRange(2, statusCol, sheet.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(true).build()
  );
}

/** Run this once from the Apps Script editor to format the sheet before the first lead arrives. */
function setup() {
  getSheet_();
}

/** Sends a fake lead so you can confirm everything works (delete the row afterwards). */
function testInsert() {
  const res = doPost({ postData: { contents: JSON.stringify({
    secret: SECRET, lead_type: "Consultation", first_name: "Test", last_name: "Lead",
    email: "test@example.com", phone: "(555) 555-1212", state: "TX", age_range: "50–59",
    goal: "Tax-free retirement income", consent: true, agent_name: "The RetireFlow Team",
    submission_id: "test-" + Date.now(),
  }) } });
  Logger.log(res.getContent());
}

// Stop spreadsheet formula injection (values starting with = + - @).
function clean_(v) {
  const s = v === undefined || v === null ? "" : String(v).slice(0, 1000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
