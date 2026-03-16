// =============================================================================
// 15_Code.gs — Menu Builder and Trigger Management
// GMU MSc MLS Thesis Coordination System
// =============================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎓 Thesis System')
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('⚙️ Setup')
        .addItem('Initialize all sheets',       'initializeAllSheets')
        .addItem('Install scheduled triggers',  'installTriggers')
        .addItem('Remove all triggers',         'removeAllTriggers')
        .addItem('Validate configuration',      'runConfigValidation')
    )
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('👥 Students')
        .addItem('Import students from CSV staging',  'importStudentsFromStaging')
        .addItem('Refresh student list',              'refreshStudentList')
        .addItem('Initialize milestones for all',     'initializeAllMilestones')
    )
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('📊 Dashboard')
        .addItem('Rebuild dashboard now',        'buildDashboard')
        .addItem('Flag at-risk students',        'flagAtRiskStudents')
        .addItem('Run full risk scan',           'runRiskScan')
    )
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('📧 Email')
        .addItem('Send ORCID requests (all)',    'sendORCIDRequestsToAll')
        .addItem('Send reflection reminders',    'sendReflectionReminders')
        .addItem('Send supervisor reminders',    'sendSupervisorReminders')
    )
    .addSeparator()
    .addSubMenu(
      SpreadsheetApp.getUi().createMenu('📄 Reports')
        .addItem('Generate all student reports', 'generateBulkReports')
    )
    .addSeparator()
    .addItem('ℹ️ System info', 'showSystemInfo')
    .addToUi();
}

function installTriggers() {
  removeAllTriggers();

  ScriptApp.newTrigger('dailyReminderCheck')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  ScriptApp.newTrigger('buildDashboard')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(7)
    .create();

  AL_logEvent({ action: AUDIT_ACTIONS.TRIGGER_INSTALLED,
    details: 'dailyReminderCheck + buildDashboard', userEmail: 'system' });
  showToast('Triggers installed: daily reminder (08:00) and weekly dashboard rebuild (Mon 07:00).');
}

function removeAllTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  showToast('All triggers removed.');
}

function runRiskScan() {
  const result = RE_runFullRiskScan();
  showToast(`Risk scan complete: ${result.evaluated} evaluated, ${result.changed} changed.`);
}

function runConfigValidation() {
  const result = CFG_validateConfig();
  const ui     = SpreadsheetApp.getUi();
  if (result.valid && result.warnings.length === 0) {
    ui.alert('Configuration Valid', '✅ All required configuration values are set.', ui.ButtonSet.OK);
  } else {
    let msg = '';
    if (result.missing.length > 0) {
      msg += `❌ Missing required values:\n${result.missing.map(k => '  • ' + k).join('\n')}\n\n`;
    }
    if (result.warnings.length > 0) {
      msg += `⚠️ Warnings:\n${result.warnings.map(w => '  • ' + w).join('\n')}`;
    }
    ui.alert('Configuration Check', msg, ui.ButtonSet.OK);
  }
}

function showSystemInfo() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const students = DS_getAllStudents();
  const count    = students.filter(s => s.status === 'Active').length;
  const triggers = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction()).join(', ') || 'None';

  const msg =
    `Program    : ${getConfig('PROGRAM_NAME')}\n` +
    `Institution: ${getConfig('INSTITUTION')}\n` +
    `Semester   : ${getConfig('CURRENT_SEMESTER')}\n` +
    `Spreadsheet: ${ss.getName()}\n` +
    `Active students: ${count}\n` +
    `Triggers   : ${triggers}\n` +
    `Last rebuild: ${getConfig('LAST_DASHBOARD_BUILD') || 'Never'}\n` +
    `Last risk scan: ${getConfig('LAST_RISK_SCAN') || 'Never'}`;

  SpreadsheetApp.getUi().alert('📋 System Info', msg, SpreadsheetApp.getUi().ButtonSet.OK);
}