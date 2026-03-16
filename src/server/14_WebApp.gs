// =============================================================================
// 14_WebApp.gs — Web App Router and API Endpoints
// GMU MSc MLS Thesis Coordination System
// =============================================================================

function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'dashboard';
  const publicPages = ['reflection', 'supervisor'];

  if (!publicPages.includes(page)) {
    const ctx = UC_getUserContext();
    if (ctx.role !== ROLES.COORDINATOR && ctx.role !== ROLES.ADMIN) {
      return HtmlService.createHtmlOutput(
        `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Access Restricted</title></head>
        <body style="font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F1F4F9;margin:0">
          <div style="text-align:center;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:40px 32px;max-width:380px">
            <div style="font-size:36px;margin-bottom:16px">🔐</div>
            <h2 style="color:#0B1F3A;font-size:18px;margin:0 0 10px;font-weight:700">Access restricted</h2>
            <p style="color:#6B7280;margin:0 0 18px;font-size:14px;line-height:1.6">
              This dashboard is for authorised GMU thesis coordinators only.
            </p>
            <p style="color:#9CA3AF;font-size:12px;margin:0">Signed in as: <strong>${ctx.email || 'not signed in'}</strong></p>
          </div>
        </body></html>`
      ).setTitle('Access Restricted');
    }
    AL_logEvent({ action: AUDIT_ACTIONS.USER_CONTEXT_RESOLVED, details: 'page:' + page, userCtx: ctx });
  }

  const pageMap = {
    dashboard  : 'Dashboard',
    reflection : 'ReflectionForm',
    supervisor : 'SupervisorPortal',
    reports    : 'Reports',
  };

  const templateName = pageMap[page] || 'Dashboard';
  const tmpl         = HtmlService.createTemplateFromFile('client/' + templateName);
  tmpl.page          = page;
  tmpl.baseUrl       = ScriptApp.getService().getUrl();

  const institution  = getConfig('INSTITUTION') || 'GMU';
  const program      = getConfig('PROGRAM_NAME') || 'MSc MLS';
  const pageTitles   = {
    Dashboard       : 'Thesis Coordination — ' + institution,
    ReflectionForm  : 'Submit Reflection — ' + program,
    SupervisorPortal: 'Supervisor Portal — ' + program,
    Reports         : 'Reports — ' + program,
  };

  return tmpl.evaluate()
    .setTitle(pageTitles[templateName] || 'Thesis System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile('client/' + filename).getContent();
}

function getWebAppUrl() {
  try { return ScriptApp.getService().getUrl(); }
  catch (e) { return ''; }
}

function API_getDashboardData() {
  try { return DS_getDashboardPayload(); }
  catch (e) { return { error: e.message }; }
}

function API_getStudentProfile(regNo) {
  try {
    const profile = DS_getStudentProfile(regNo);
    if (!profile) return { error: 'Student not found: ' + regNo };
    profile.riskReport = RE_getStudentRiskReport(regNo);
    return profile;
  } catch (e) { return { error: e.message }; }
}

function API_updateMilestoneStatus(regNo, milestoneName, newStatus, notes) {
  try {
    MS_updateMilestoneStatus(regNo, milestoneName, newStatus, null, notes);
    const student    = DS_getStudent(regNo);
    const riskReport = RE_evaluateStudent(regNo);
    if (student && riskReport.riskFlag !== student.riskFlag) {
      DS_updateStudentField(regNo, COL.STUDENTS.RISK_FLAG, riskReport.riskFlag);
    }
    AL_logEvent({ action: AUDIT_ACTIONS.MILESTONE_STATUS_UPDATED, targetRegNo: regNo,
      details: milestoneName + ' → ' + newStatus });
    return { success: true, riskFlag: riskReport.riskFlag };
  } catch (e) { return { error: e.message }; }
}

function API_setEnrollmentDate(regNo, enrollmentDateStr) {
  try {
    const d = new Date(enrollmentDateStr);
    if (isNaN(d)) return { error: 'Invalid date format.' };
    MS_setEnrollmentDateAndRecalculateTargets(regNo, d);
    return { success: true };
  } catch (e) { return { error: e.message }; }
}

function API_addCoordinatorNote(regNo, noteText, category) {
  try {
    if (!noteText || !noteText.trim()) return { error: 'Note text is required.' };
    DS_addCoordinatorNote(regNo, noteText, category || 'General');
    AL_logEvent({ action: AUDIT_ACTIONS.COORDINATOR_NOTE_ADDED, targetRegNo: regNo,
      details: truncate(noteText, 100) });
    return { success: true, timestamp: new Date().toISOString() };
  } catch (e) { return { error: e.message }; }
}

function API_setNextFollowUp(regNo, followUpDateStr) {
  try {
    DS_updateStudentField(regNo, COL.STUDENTS.NEXT_FOLLOWUP, new Date(followUpDateStr));
    return { success: true };
  } catch (e) { return { error: e.message }; }
}

function API_sendEmailToStudent(regNo, subject, bodyHtml) {
  try {
    if (!subject || !bodyHtml) return { error: 'Subject and body are required.' };
    const success = AUTO_sendIndividualEmail(regNo, subject, bodyHtml);
    return { success: success };
  } catch (e) { return { error: e.message }; }
}

function API_sendORCIDRequest(regNo) {
  try {
    const student = DS_getStudent(regNo);
    if (!student) return { error: 'Student not found: ' + regNo };
    const formUrl = getConfig('ORCID_FORM_URL');
    const subject = 'Action required: Submit your ORCID iD — ' + getConfig('PROGRAM_NAME');
    const body    = EMAIL_buildORCIDRequestBody(student, formUrl);
    const success = EMAIL_send(student.studentEmail, subject, body);
    if (success) DS_logEmail(student.studentEmail, student.studentName, 'ORCID_REQUEST', subject, 'Sent', 'Coordinator');
    return { success: success };
  } catch (e) { return { error: e.message }; }
}

function API_updateORCID(regNo, orcid) {
  try {
    const cleaned = normalizeORCID(orcid);
    if (!isValidORCID(cleaned)) return { error: 'Invalid ORCID format. Expected: 0000-0000-0000-0000' };
    DS_updateStudentFields(regNo, {
      [COL.STUDENTS.ORCID]      : cleaned,
      [COL.STUDENTS.ORCID_DATE] : new Date(),
    });
    return { success: true, orcid: cleaned };
  } catch (e) { return { error: e.message }; }
}

function API_rebuildDashboard() {
  try {
    RE_runFullRiskScan();
    buildDashboard();
    return API_getDashboardData();
  } catch (e) { return { error: e.message }; }
}

function API_getSystemStats() {
  try {
    const students = DS_getAllStudents();
    const active   = students.filter(s => s.status === STUDENT_STATUS.ACTIVE).length;
    const triggers = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
    return {
      programName       : getConfig('PROGRAM_NAME'),
      institution       : getConfig('INSTITUTION'),
      semester          : getConfig('CURRENT_SEMESTER'),
      coordinatorName   : getConfig('COORDINATOR_NAME'),
      totalStudents     : students.length,
      activeStudents    : active,
      cohorts           : DS_getCohorts(),
      triggersInstalled : triggers,
      lastDashboardBuild: getConfig('LAST_DASHBOARD_BUILD'),
      webAppUrl         : getWebAppUrl(),
    };
  } catch (e) { return { error: e.message }; }
}

function API_runRiskScan() {
  try {
    const result = RE_runFullRiskScan();
    return { success: true, evaluated: result.evaluated, changed: result.changed, highRisk: result.highRisk };
  } catch (e) { return { error: e.message }; }
}

function API_getClientContext() {
  try { return UC_getClientContext(); }
  catch (e) { return { error: e.message }; }
}

function API_getAuditLog(limit) {
  try {
    const ctx = UC_getUserContext();
    AC_requirePermission(ctx, PERMISSIONS.VIEW_AUDIT_LOG);
    return AL_getRecentEvents(limit || 50);
  } catch (e) { return { error: e.message }; }
}

function API_getAnalytics(windowDays) {
  try {
    const ctx = UC_getUserContext();
    AC_requirePermission(ctx, PERMISSIONS.VIEW_REPORTS);
    return AN_getFullAnalyticsPayload(windowDays || 90);
  } catch (e) { return { error: e.message }; }
}

function API_validateConfiguration() {
  try { return CFG_validateConfig(); }
  catch (e) { return { error: e.message }; }
}