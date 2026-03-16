// =============================================================================
// 05_SheetSetup.gs — Spreadsheet Initialization
// GMU MSc MLS Thesis Coordination System
// =============================================================================

function initializeAllSheets() {
  const ui = SpreadsheetApp.getUi();
  try {
    setupStudentsSheet();
    setupMilestonesSheet();
    setupReflectionsSheet();
    setupSupervisorFeedbackSheet();
    setupEmailLogSheet();
    setupConfigSheet();
    setupDashboardSheet();
    setupCSVImportSheet();
    setupUsersSheet();
    setupAuditLogSheet();
    setupCoordinatorNotesSheet();

    showToast('✅ All sheets initialized successfully.');
    ui.alert(
      'Setup Complete',
      'All 11 sheets have been created.\n\n' +
      'Next: Open the CONFIG sheet and fill in:\n' +
      '  • COORDINATOR_EMAIL\n' +
      '  • COORDINATOR_NAME\n' +
      '  • CURRENT_SEMESTER\n\n' +
      'Then add yourself to the USERS sheet with role: coordinator\n\n' +
      'Then run: Students → Import students from CSV staging.',
      ui.ButtonSet.OK
    );
  } catch (e) {
    ui.alert('Setup Error', e.message, ui.ButtonSet.OK);
    Logger.log('initializeAllSheets error: ' + e.message);
  }
}

function getOrCreateSheet(name) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function applyHeaders(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function applyHeaderStyle(sheet, colCount) {
  const headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange
    .setBackground('#1a5276')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(11)
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sheet.setRowHeight(1, 36);
}

function isHeaderPresent(sheet, expectedFirst) {
  return sheet.getRange(1, 1).getValue() === expectedFirst;
}

function setupStudentsSheet() {
  const sheet = getOrCreateSheet(SHEETS.STUDENTS);
  if (isHeaderPresent(sheet, 'RegNo')) return;
  const headers = [
    'RegNo','StudentName','StudentEmail',
    'SupervisorName','SupervisorEmail','CoSupervisor',
    'ORCID','ORCIDSubmittedDate','EnrollmentDate',
    'Status','CoordinatorNotes',
    'LastContactDate','NextFollowUpDate','RiskFlag','CreatedDate'
  ];
  applyHeaders(sheet, headers);
  applyHeaderStyle(sheet, headers.length);
  sheet.setColumnWidth(1, 100); sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 210); sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(5, 210); sheet.setColumnWidth(11, 220);
  sheet.setFrozenRows(1);
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(STUDENT_STATUS), true)
    .setAllowInvalid(false).build();
  sheet.getRange(2, COL.STUDENTS.STATUS, 500, 1).setDataValidation(statusRule);
}

function setupMilestonesSheet() {
  const sheet = getOrCreateSheet(SHEETS.MILESTONES);
  if (isHeaderPresent(sheet, 'RegNo')) return;
  const headers = [
    'RegNo','StudentName','MilestoneName','MilestoneOrder',
    'Status','TargetDate','CompletionDate','DaysOverdue',
    'FollowUpNeeded','SupervisorApproved','Notes'
  ];
  applyHeaders(sheet, headers);
  applyHeaderStyle(sheet, headers.length);
  sheet.setColumnWidth(3, 200); sheet.setColumnWidth(11, 250);
  sheet.setFrozenRows(1);
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.values(MILESTONE_STATUS), true)
    .setAllowInvalid(false).build();
  sheet.getRange(2, COL.MILESTONES.STATUS, 1000, 1).setDataValidation(statusRule);
}

function setupReflectionsSheet() {
  const sheet = getOrCreateSheet(SHEETS.REFLECTIONS);
  if (isHeaderPresent(sheet, 'Timestamp')) return;
  const headers = [
    'Timestamp','RegNo','StudentName','StudentEmail',
    'MilestoneName','ReflectionText','ChallengesFaced',
    'SupportNeeded','ProcessedDate'
  ];
  applyHeaders(sheet, headers);
  applyHeaderStyle(sheet, headers.length);
  sheet.setColumnWidth(6, 300); sheet.setColumnWidth(7, 250);
  sheet.setFrozenRows(1);
}

function setupSupervisorFeedbackSheet() {
  const sheet = getOrCreateSheet(SHEETS.SUPERVISOR_FEEDBACK);
  if (isHeaderPresent(sheet, 'Timestamp')) return;
  const headers = [
    'Timestamp','SupervisorEmail','SupervisorName',
    'StudentRegNo','StudentName','MilestoneReviewed',
    'Comments','Concerns','Recommendations','ProcessedDate'
  ];
  applyHeaders(sheet, headers);
  applyHeaderStyle(sheet, headers.length);
  sheet.setColumnWidth(7, 280); sheet.setColumnWidth(9, 280);
  sheet.setFrozenRows(1);
}

function setupEmailLogSheet() {
  const sheet = getOrCreateSheet(SHEETS.EMAIL_LOG);
  if (isHeaderPresent(sheet, 'Timestamp')) return;
  const headers = [
    'Timestamp','RecipientEmail','RecipientName',
    'EmailType','Subject','Status','TriggeredBy'
  ];
  applyHeaders(sheet, headers);
  applyHeaderStyle(sheet, headers.length);
  sheet.setColumnWidth(5, 280);
  sheet.setFrozenRows(1);
}

function setupConfigSheet() {
  const sheet = getOrCreateSheet(SHEETS.CONFIG);
  applyHeaders(sheet, ['Key','Value','Description']);
  applyHeaderStyle(sheet, 3);
  sheet.setColumnWidth(1, 200); sheet.setColumnWidth(2, 250); sheet.setColumnWidth(3, 350);
  sheet.setFrozenRows(1);
  const existingKeys = getColumnValues(sheet, COL.CONFIG.KEY);
  DEFAULT_CONFIG.forEach(([key, value, description]) => {
    if (!existingKeys.includes(key)) sheet.appendRow([key, value, description]);
  });
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, COL.CONFIG.KEY, lastRow - 1, 1)
      .setBackground('#f3f3f3').setFontStyle('italic');
  }
}

function setupDashboardSheet() {
  const sheet = getOrCreateSheet(SHEETS.DASHBOARD);
  if (isHeaderPresent(sheet, 'RegNo')) return;
  const milestoneHeaders = MILESTONES.map(m => m.name);
  const headers = [
    'RegNo','StudentName','StudentEmail','ORCID',
    'SupervisorName','SupervisorEmail','CoSupervisor',
    ...milestoneHeaders,
    'OverallProgress%','LastReflection','LastFeedback',
    'LastContactDate','NextFollowUpDate','RiskFlag','DashboardUpdated'
  ];
  applyHeaders(sheet, headers);
  applyHeaderStyle(sheet, headers.length);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);
  sheet.getRange(1,1).setNote('Auto-generated. Do not edit manually.');
}

function setupCSVImportSheet() {
  const sheet = getOrCreateSheet(SHEETS.CSV_IMPORT);
  sheet.clearContents();
  sheet.getRange('A1').setValue('CSV IMPORT STAGING AREA').setFontWeight('bold').setFontSize(12);
  sheet.getRange('A2').setValue('Paste your CSV data starting from row 5. Row 5 must be the header row.').setWrap(true);
  const exampleHeaders = ['RegNo','StudentName','StudentEmail','SupervisorName','SupervisorEmail','CoSupervisor'];
  sheet.getRange(5, 1, 1, exampleHeaders.length).setValues([exampleHeaders])
    .setFontWeight('bold').setBackground('#e8f0fe');
}

function setupUsersSheet() {
  const sheet = getOrCreateSheet('USERS');
  if (isHeaderPresent(sheet, 'Email')) return;
  const headers = ['Email','Role','DisplayName','Notes','Active'];
  applyHeaders(sheet, headers);
  applyHeaderStyle(sheet, headers.length);
  sheet.setColumnWidth(1, 220); sheet.setColumnWidth(2, 130);
  sheet.setColumnWidth(3, 200); sheet.setColumnWidth(4, 280);
  sheet.setFrozenRows(1);
  const roleRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['coordinator','supervisor','student','admin'], true)
    .setAllowInvalid(false).build();
  sheet.getRange(2, 2, 500, 1).setDataValidation(roleRule);
}

function setupAuditLogSheet() {
  const sheet = getOrCreateSheet('AUDIT_LOG');
  if (isHeaderPresent(sheet, 'Timestamp')) return;
  const headers = ['Timestamp','UserEmail','UserRole','ActionType','TargetRegNo','Details','Status'];
  applyHeaders(sheet, headers);
  applyHeaderStyle(sheet, headers.length);
  sheet.setColumnWidth(1, 160); sheet.setColumnWidth(2, 210);
  sheet.setColumnWidth(4, 200); sheet.setColumnWidth(6, 350);
  sheet.setFrozenRows(1);
}

function setupCoordinatorNotesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName('COORDINATOR_NOTES')) return;
  const sheet = ss.insertSheet('COORDINATOR_NOTES');
  const headers = ['Timestamp','RegNo','NoteText','Category','AddedBy'];
  applyHeaders(sheet, headers);
  applyHeaderStyle(sheet, headers.length);
  sheet.setColumnWidth(3, 380);
  sheet.setFrozenRows(1);
}