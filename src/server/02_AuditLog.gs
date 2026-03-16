// =============================================================================
// 02_AuditLog.gs — System Activity Logging
// GMU MSc MLS Thesis Coordination System
// =============================================================================

const AUDIT_LOG_SHEET = 'AUDIT_LOG';

const AUDIT_ACTIONS = {
  STUDENT_IMPORTED         : 'STUDENT_IMPORTED',
  STUDENT_STATUS_CHANGED   : 'STUDENT_STATUS_CHANGED',
  ORCID_SUBMITTED          : 'ORCID_SUBMITTED',
  ENROLLMENT_DATE_SET      : 'ENROLLMENT_DATE_SET',
  MILESTONE_STATUS_UPDATED : 'MILESTONE_STATUS_UPDATED',
  MILESTONE_INITIALIZED    : 'MILESTONE_INITIALIZED',
  REFLECTION_SUBMITTED     : 'REFLECTION_SUBMITTED',
  FEEDBACK_SUBMITTED       : 'FEEDBACK_SUBMITTED',
  COORDINATOR_NOTE_ADDED   : 'COORDINATOR_NOTE_ADDED',
  RISK_FLAG_CHANGED        : 'RISK_FLAG_CHANGED',
  EMAIL_SENT               : 'EMAIL_SENT',
  EMAIL_FAILED             : 'EMAIL_FAILED',
  BULK_EMAIL_TRIGGERED     : 'BULK_EMAIL_TRIGGERED',
  DASHBOARD_REBUILT        : 'DASHBOARD_REBUILT',
  RISK_SCAN_RUN            : 'RISK_SCAN_RUN',
  TRIGGER_INSTALLED        : 'TRIGGER_INSTALLED',
  REPORTS_GENERATED        : 'REPORTS_GENERATED',
  PERMISSION_DENIED        : 'PERMISSION_DENIED',
  USER_CONTEXT_RESOLVED    : 'USER_CONTEXT_RESOLVED',
};

function AL_logEvent(event) {
  const {
    action      = 'UNKNOWN',
    targetRegNo = '',
    details     = '',
    status      = 'SUCCESS',
    userCtx,
    userEmail,
    userRole,
  } = event;

  const email = userCtx?.email || userEmail || 'system';
  const role  = userCtx?.role  || userRole  || 'system';
  const ts    = new Date();

  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(AUDIT_LOG_SHEET);
    if (!sheet) {
      Logger.log(`[AUDIT] ${ts.toISOString()} | ${email} | ${role} | ${action} | ${targetRegNo} | ${status}`);
      return;
    }
    sheet.appendRow([ts, email, role, action, targetRegNo, truncate(details, 500), status]);
  } catch (e) {
    Logger.log(`[AUDIT-FALLBACK] ${e.message} | ${action} | ${email}`);
  }
}

function AL_logRiskFlagChange(regNo, oldFlag, newFlag) {
  AL_logEvent({
    action      : AUDIT_ACTIONS.RISK_FLAG_CHANGED,
    targetRegNo : regNo,
    details     : `${oldFlag} → ${newFlag}`,
    status      : 'SUCCESS',
    userEmail   : 'system',
    userRole    : 'system',
  });
}

function AL_logEmailSent(toEmail, toName, emailType, subject, success) {
  AL_logEvent({
    action      : success ? AUDIT_ACTIONS.EMAIL_SENT : AUDIT_ACTIONS.EMAIL_FAILED,
    targetRegNo : '',
    details     : `To: ${toName} <${toEmail}> | Type: ${emailType} | Subject: ${truncate(subject, 100)}`,
    status      : success ? 'SUCCESS' : 'FAILED',
    userEmail   : 'system',
    userRole    : 'system',
  });
}

function AL_getRecentEvents(limit) {
  limit = limit || 100;
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(AUDIT_LOG_SHEET);
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const start  = Math.max(2, lastRow - limit + 1);
    const count  = lastRow - start + 1;
    const values = sheet.getRange(start, 1, count, 7).getValues();
    return values.reverse().map(r => ({
      timestamp  : r[0] ? new Date(r[0]).toISOString() : '',
      userEmail  : r[1],
      userRole   : r[2],
      action     : r[3],
      targetRegNo: r[4],
      details    : r[5],
      status     : r[6],
    }));
  } catch (e) {
    log(`AL_getRecentEvents: ${e.message}`, 'ERROR');
    return [];
  }
}

function AL_getActionSummary(days) {
  days = days || 30;
  const cutoff = addDays(today(), -days);
  const summary = {};
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(AUDIT_LOG_SHEET);
    if (!sheet) return summary;
    const rows = getDataRows(sheet);
    rows.forEach(r => {
      const ts = r[0] ? new Date(r[0]) : null;
      if (!ts || ts < cutoff) return;
      const action = String(r[3] || '');
      summary[action] = (summary[action] || 0) + 1;
    });
  } catch (e) {
    log(`AL_getActionSummary: ${e.message}`, 'ERROR');
  }
  return summary;
}