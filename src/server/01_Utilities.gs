// =============================================================================
// 01_Utilities.gs — Shared helper functions
// GMU MSc MLS Thesis Coordination System
// =============================================================================

function getSheet(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error(
      `Sheet "${name}" not found. Run Setup → Initialize all sheets first.`
    );
  }
  return sheet;
}

function getDataRows(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function getColumnValues(sheet, colIndex) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, colIndex, lastRow - 1, 1)
    .getValues()
    .flat()
    .map(v => String(v).trim());
}

function findRowByValue(sheet, colIndex, value) {
  const values = getColumnValues(sheet, colIndex);
  const idx    = values.findIndex(v => v === String(value).trim());
  return idx === -1 ? -1 : idx + 2;
}

function findAllRowsByValue(sheet, colIndex, value) {
  const rows   = getDataRows(sheet);
  const target = String(value).trim();
  const result = [];
  rows.forEach((row, i) => {
    if (String(row[colIndex - 1]).trim() === target) {
      result.push({ rowIndex: i + 2, rowData: row });
    }
  });
  return result;
}

function findStudentRow(regNo) {
  const sheet = getSheet(SHEETS.STUDENTS);
  return findRowByValue(sheet, COL.STUDENTS.REG_NO, regNo);
}

function getStudentByRegNo(regNo) {
  const sheet  = getSheet(SHEETS.STUDENTS);
  const rowNum = findStudentRow(regNo);
  if (rowNum === -1) return null;
  const row = sheet.getRange(rowNum, 1, 1, 15).getValues()[0];
  return studentRowToObject(row);
}

function studentRowToObject(row) {
  return {
    regNo           : row[COL.STUDENTS.REG_NO            - 1],
    studentName     : row[COL.STUDENTS.STUDENT_NAME      - 1],
    studentEmail    : row[COL.STUDENTS.STUDENT_EMAIL      - 1],
    supervisorName  : row[COL.STUDENTS.SUPERVISOR_NAME   - 1],
    supervisorEmail : row[COL.STUDENTS.SUPERVISOR_EMAIL  - 1],
    coSupervisor    : row[COL.STUDENTS.CO_SUPERVISOR     - 1],
    orcid           : row[COL.STUDENTS.ORCID             - 1],
    orcidDate       : row[COL.STUDENTS.ORCID_DATE        - 1],
    enrollmentDate  : row[COL.STUDENTS.ENROLLMENT_DATE   - 1],
    status          : row[COL.STUDENTS.STATUS            - 1],
    notes           : row[COL.STUDENTS.COORDINATOR_NOTES - 1],
    lastContact     : row[COL.STUDENTS.LAST_CONTACT      - 1],
    nextFollowup    : row[COL.STUDENTS.NEXT_FOLLOWUP     - 1],
    riskFlag        : row[COL.STUDENTS.RISK_FLAG         - 1],
    createdDate     : row[COL.STUDENTS.CREATED_DATE      - 1],
  };
}

function getAllActiveStudents() {
  const sheet = getSheet(SHEETS.STUDENTS);
  const rows  = getDataRows(sheet);
  return rows
    .map(r => studentRowToObject(r))
    .filter(s => s.status === STUDENT_STATUS.ACTIVE && s.regNo !== '');
}

function getConfig(key) {
  try {
    const sheet  = getSheet(SHEETS.CONFIG);
    const rowNum = findRowByValue(sheet, COL.CONFIG.KEY, key);
    if (rowNum === -1) return '';
    return String(sheet.getRange(rowNum, COL.CONFIG.VALUE).getValue()).trim();
  } catch (e) {
    return '';
  }
}

function setConfig(key, value) {
  const sheet  = getSheet(SHEETS.CONFIG);
  const rowNum = findRowByValue(sheet, COL.CONFIG.KEY, key);
  if (rowNum !== -1) {
    sheet.getRange(rowNum, COL.CONFIG.VALUE).setValue(value);
  } else {
    sheet.appendRow([key, value, '']);
  }
}

function formatDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function today() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(d1, d2) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((d2 - d1) / msPerDay);
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function weeksFromDate(startDate, weeks) {
  return addDays(startDate, weeks * 7);
}

function sanitizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function isValidORCID(orcid) {
  const cleaned = String(orcid).trim().replace('https://orcid.org/', '');
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(cleaned);
}

function normalizeORCID(orcid) {
  return String(orcid).trim().replace('https://orcid.org/', '').trim();
}

function truncate(str, maxLength) {
  const s = String(str || '');
  return s.length > maxLength ? s.slice(0, maxLength - 1) + '…' : s;
}

function showToast(message, title) {
  SpreadsheetApp.getActiveSpreadsheet()
    .toast(message, title || '📋 Thesis System', 4);
}

function log(message, level) {
  const prefix = level || 'INFO';
  Logger.log(`[${prefix}] ${message}`);
}