// =============================================================================
// 06_StudentManager.gs — Student Record Management
// GMU MSc MLS Thesis Coordination System
// =============================================================================

const CSV_REQUIRED_COLUMNS = [
  'RegNo','StudentName','StudentEmail','SupervisorName','SupervisorEmail'
];

function importStudentsFromStaging() {
  const ui = SpreadsheetApp.getUi();
  try {
    const stagingSheet  = getSheet(SHEETS.CSV_IMPORT);
    const studentsSheet = getSheet(SHEETS.STUDENTS);
    const HEADER_ROW    = 5;
    const headerValues  = stagingSheet
      .getRange(HEADER_ROW, 1, 1, stagingSheet.getLastColumn())
      .getValues()[0].map(v => String(v).trim());

    const missing = CSV_REQUIRED_COLUMNS.filter(col => !headerValues.includes(col));
    if (missing.length > 0) {
      ui.alert('Missing CSV Columns',
        'Required columns not found in row 5:\n\n' + missing.join(', '),
        ui.ButtonSet.OK);
      return;
    }

    const colMap = {};
    headerValues.forEach((name, i) => { colMap[name] = i; });

    const lastRow = stagingSheet.getLastRow();
    if (lastRow <= HEADER_ROW) {
      ui.alert('No Data', 'No student rows found below the header.', ui.ButtonSet.OK);
      return;
    }

    const rawRows = stagingSheet
      .getRange(HEADER_ROW + 1, 1, lastRow - HEADER_ROW, headerValues.length)
      .getValues();

    const existingRegNos = getColumnValues(studentsSheet, COL.STUDENTS.REG_NO);
    const results = { imported: 0, skipped: 0, errors: [] };

    rawRows.forEach((row, rowIdx) => {
      if (row.every(cell => String(cell).trim() === '')) return;
      const record = extractStudentFromRow(row, colMap);
      const validationError = validateStudentRecord(record);
      if (validationError) {
        results.errors.push(`Row ${HEADER_ROW + rowIdx + 1}: ${validationError}`);
        return;
      }
      if (existingRegNos.includes(String(record.regNo).trim())) {
        results.skipped++;
        return;
      }
      writeStudentRecord(studentsSheet, record);
      results.imported++;
    });

    const summary =
      `Import complete.\n\n` +
      `✅ Imported : ${results.imported} students\n` +
      `⏭ Skipped  : ${results.skipped} (already exist)\n` +
      (results.errors.length > 0
        ? `\n⚠️ Errors (${results.errors.length}):\n${results.errors.join('\n')}`
        : '');

    showToast(`Imported ${results.imported} student(s).`);

    if (results.imported > 0) {
      const response = ui.alert('Import Complete',
        summary + '\n\nInitialize milestone rows for all imported students now?',
        ui.ButtonSet.YES_NO);
      if (response === ui.Button.YES) initializeAllMilestones();
      else ui.alert('Import Complete', summary, ui.ButtonSet.OK);
    } else {
      ui.alert('Import Complete', summary, ui.ButtonSet.OK);
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('Import Error', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

function extractStudentFromRow(row, colMap) {
  const get = (name) => {
    const idx = colMap[name];
    return idx !== undefined ? String(row[idx] || '').trim() : '';
  };
  return {
    regNo          : get('RegNo'),
    studentName    : get('StudentName'),
    studentEmail   : sanitizeEmail(get('StudentEmail')),
    supervisorName : get('SupervisorName'),
    supervisorEmail: sanitizeEmail(get('SupervisorEmail')),
    coSupervisor   : get('CoSupervisor') || '',
  };
}

function validateStudentRecord(record) {
  if (!record.regNo)           return 'RegNo is empty';
  if (!record.studentName)     return 'StudentName is empty';
  if (!record.studentEmail)    return 'StudentEmail is empty';
  if (!record.supervisorName)  return 'SupervisorName is empty';
  if (!record.supervisorEmail) return 'SupervisorEmail is empty';
  if (!isValidEmail(record.studentEmail))
    return `Invalid student email: ${record.studentEmail}`;
  if (!isValidEmail(record.supervisorEmail))
    return `Invalid supervisor email: ${record.supervisorEmail}`;
  return null;
}

function writeStudentRecord(sheet, record) {
  const now    = new Date();
  const newRow = new Array(15).fill('');
  newRow[COL.STUDENTS.REG_NO            - 1] = record.regNo;
  newRow[COL.STUDENTS.STUDENT_NAME      - 1] = record.studentName;
  newRow[COL.STUDENTS.STUDENT_EMAIL     - 1] = record.studentEmail;
  newRow[COL.STUDENTS.SUPERVISOR_NAME   - 1] = record.supervisorName;
  newRow[COL.STUDENTS.SUPERVISOR_EMAIL  - 1] = record.supervisorEmail;
  newRow[COL.STUDENTS.CO_SUPERVISOR     - 1] = record.coSupervisor;
  newRow[COL.STUDENTS.STATUS            - 1] = STUDENT_STATUS.ACTIVE;
  newRow[COL.STUDENTS.RISK_FLAG         - 1] = RISK_FLAGS.ON_TRACK;
  newRow[COL.STUDENTS.CREATED_DATE      - 1] = now;
  sheet.appendRow(newRow);
}

function initializeAllMilestones() {
  const studentsSheet   = getSheet(SHEETS.STUDENTS);
  const milestonesSheet = getSheet(SHEETS.MILESTONES);
  const students        = getAllActiveStudents();
  const existingEntries = getAllMilestoneKeys(milestonesSheet);
  let created = 0;

  students.forEach(student => {
    MILESTONES.forEach(milestone => {
      const key = `${student.regNo}::${milestone.name}`;
      if (existingEntries.has(key)) return;

      let targetDate = '';
      if (student.enrollmentDate && student.enrollmentDate instanceof Date) {
        targetDate = weeksFromDate(student.enrollmentDate, milestone.defaultWeeks);
      }

      const newRow = new Array(11).fill('');
      newRow[COL.MILESTONES.REG_NO              - 1] = student.regNo;
      newRow[COL.MILESTONES.STUDENT_NAME        - 1] = student.studentName;
      newRow[COL.MILESTONES.MILESTONE_NAME      - 1] = milestone.name;
      newRow[COL.MILESTONES.MILESTONE_ORDER     - 1] = milestone.order;
      newRow[COL.MILESTONES.STATUS              - 1] = MILESTONE_STATUS.NOT_STARTED;
      newRow[COL.MILESTONES.TARGET_DATE         - 1] = targetDate;
      newRow[COL.MILESTONES.FOLLOWUP_NEEDED     - 1] = 'No';
      newRow[COL.MILESTONES.SUPERVISOR_APPROVED - 1] = 'No';
      milestonesSheet.appendRow(newRow);
      created++;
    });
  });

  applyDaysOverdueFormulas(milestonesSheet);
  showToast(`Milestones initialized: ${created} rows created.`);
}

function getAllMilestoneKeys(sheet) {
  const rows = getDataRows(sheet);
  const keys = new Set();
  rows.forEach(row => {
    const regNo = String(row[COL.MILESTONES.REG_NO - 1]).trim();
    const name  = String(row[COL.MILESTONES.MILESTONE_NAME - 1]).trim();
    if (regNo && name) keys.add(`${regNo}::${name}`);
  });
  return keys;
}

function applyDaysOverdueFormulas(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const formulas = [];
  for (let r = 2; r <= lastRow; r++) {
    formulas.push([`=IF(AND(G${r}="",F${r}<>"",F${r}<TODAY()),TODAY()-F${r},0)`]);
  }
  sheet.getRange(2, COL.MILESTONES.DAYS_OVERDUE, lastRow - 1, 1).setFormulas(formulas);
}

function refreshStudentList() {
  const milestonesSheet = getSheet(SHEETS.MILESTONES);
  const students        = getAllActiveStudents();
  const studentMap      = {};
  students.forEach(s => { studentMap[s.regNo] = s; });
  const rows    = getDataRows(milestonesSheet);
  let   updated = 0;
  rows.forEach((row, i) => {
    const regNo   = String(row[COL.MILESTONES.REG_NO - 1]).trim();
    const student = studentMap[regNo];
    if (!student) return;
    const rowNum      = i + 2;
    const currentName = String(row[COL.MILESTONES.STUDENT_NAME - 1]).trim();
    if (currentName !== student.studentName) {
      milestonesSheet.getRange(rowNum, COL.MILESTONES.STUDENT_NAME).setValue(student.studentName);
      updated++;
    }
  });
  showToast(`Refreshed. ${updated} name(s) updated.`);
}