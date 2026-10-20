/**
 * BrightNest Cleaning — Captura de leads en Google Sheets
 *
 * Qué hace:
 *  - Recibe los datos del formulario de la landing (doPost).
 *  - Si el email YA existe en la hoja, REESCRIBE esa fila con los datos nuevos
 *    y suma 1 al contador de solicitudes (no se duplican clientes).
 *  - Si es nuevo, agrega una fila con estado "New".
 *  - (Opcional) Te manda un email de aviso por cada lead.
 *
 * Instalación: ver README.md
 */

// ===== CONFIGURACIÓN =====
const SHEET_NAME = 'Leads';
const NOTIFY_EMAIL = '';          // ej. 'tucorreo@gmail.com' — vacío = sin aviso
const TIMEZONE = 'America/Chicago';

const HEADERS = [
  'Created', 'Last Updated', 'First Name', 'Last Name', 'Email', 'Phone',
  'ZIP', 'Service', 'Frequency', 'Preferred Date', 'Message',
  'Submissions', 'Status', 'Source', 'Language'
];
const FIELDS = ['firstName', 'lastName', 'email', 'phone', 'zip', 'service',
                'frequency', 'date', 'message'];
const STATUSES = ['New', 'Contacted', 'Quoted', 'Booked', 'Lost'];

// Columnas (1-based) que se usan en el código
const COL = {
  created: 1, updated: 2, email: 5, submissions: 12, status: 13, source: 14, language: 15
};

/** Ejecuta esto UNA vez desde el editor para preparar la hoja. */
function setup() {
  const sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground('#0e7c6b')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);

  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUSES, true).build();
  sheet.getRange(2, COL.status, sheet.getMaxRows() - 1, 1).setDataValidation(statusRule);

  // Colores por estado
  const range = sheet.getRange(2, COL.status, sheet.getMaxRows() - 1, 1);
  const colors = { New: '#fff4cc', Contacted: '#dbeafe', Quoted: '#ede9fe', Booked: '#d1fae5', Lost: '#fee2e2' };
  sheet.setConditionalFormatRules(Object.keys(colors).map(s =>
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(s).setBackground(colors[s]).setRanges([range]).build()
  ));
}

/** Recibe el POST del formulario. */
function doPost(e) {
  const p = (e && e.parameter) || {};

  // Honeypot: si un bot llenó el campo oculto, ignorar en silencio
  if (p.website) return json_({ ok: true });

  const email = clean_(p.email).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json_({ ok: false, error: 'invalid email' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    if (sheet.getLastRow() === 0) setup();

    const now = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
    const values = FIELDS.map(f => f === 'email' ? email : clean_(p[f]));
    const existingRow = findRowByEmail_(sheet, email);

    let action;
    if (existingRow) {
      // Reescribe los datos de contacto del cliente existente
      sheet.getRange(existingRow, COL.updated).setValue(now);
      sheet.getRange(existingRow, 3, 1, FIELDS.length).setValues([values]);
      const countCell = sheet.getRange(existingRow, COL.submissions);
      countCell.setValue((Number(countCell.getValue()) || 1) + 1);
      sheet.getRange(existingRow, COL.status).setValue('New');
      sheet.getRange(existingRow, COL.source, 1, 2).setValues([[clean_(p.source), clean_(p.language)]]);
      action = 'updated';
    } else {
      sheet.appendRow([now, now].concat(values, [1, 'New', clean_(p.source), clean_(p.language)]));
      action = 'created';
    }

    notify_(values.concat(clean_(p.language)), action);
    return json_({ ok: true, action: action });
  } finally {
    lock.releaseLock();
  }
}

/** Permite comprobar en el navegador que la Web App está viva. */
function doGet() {
  return json_({ ok: true, service: 'BrightNest leads' });
}

// ===== Helpers =====

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}

function findRowByEmail_(sheet, email) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const emails = sheet.getRange(2, COL.email, last - 1, 1).getValues();
  for (let i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).trim().toLowerCase() === email) return i + 2;
  }
  return 0;
}

/** Limpia texto y evita inyección de fórmulas (=, +, -, @). */
function clean_(v) {
  let s = String(v == null ? '' : v).trim().slice(0, 2000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function notify_(values, action) {
  if (!NOTIFY_EMAIL) return;
  const [first, last, email, phone, zip, service, frequency, date, message, language] = values;
  const subject = (action === 'created' ? '🧽 New lead: ' : '🔁 Returning lead: ') + first + ' ' + last;
  const body = [
    'Name: ' + first + ' ' + last,
    'Email: ' + email,
    'Phone: ' + phone,
    'ZIP: ' + zip,
    'Service: ' + service + ' (' + frequency + ')',
    'Preferred date: ' + (date || '—'),
    'Message: ' + (message || '—'),
    'Language: ' + (language || '—'),
    '',
    'Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  ].join('\n');
  MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: subject, body: body, replyTo: email });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Prueba manual desde el editor: simula un envío del formulario. */
function testDoPost() {
  const res = doPost({ parameter: {
    firstName: 'Test', lastName: 'Client', email: 'test.client@example.com',
    phone: '(512) 555-0100', zip: '78701', service: 'Deep cleaning',
    frequency: 'One-time', date: '2026-11-05', message: '3 bed / 2 bath, one dog',
    source: 'manual test', language: 'Spanish'
  }});
  Logger.log(res.getContent());
}
