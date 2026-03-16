// =============================================================================
// 07_DataService.gs — Data Access Layer
// GMU MSc MLS Thesis Coordination System
// =============================================================================

function DS_getAllStudents(statusFilter, cohortFilter) {
  const sheet = getSheet(SHEETS.STUDENTS);
  const rows  = getDataRows(sheet);
  return rows.map(r => studentRowToObject(r)).filter(s => {
    if (!s.regNo) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });
}

function DS_getStudent(regNo) {
  return getStudentByRegNo(regNo);
}

function DS_getCohorts() {
  const sheet = getSheet(SHEETS.STUDENTS);
  const vals  = getColumnValues(sheet, 16);
  return [...new Set(vals.filter(c => c !== ''))].sort();
}

function DS_updateStudentField(regNo, fieldCol, value) {
  const sheet  = getSheet(SHEETS.STUDENTS);
  const rowNum = findStudentRow(regNo);
  if (rowNum === -1) throw new Error(`Student not found: ${regNo}`);
  sheet.getRange(rowNum, fieldCol).setValue(value);
}

function DS_updateStudentFields(regNo, fieldsMap) {
  const sheet  = getSheet(SHEETS.STUDENTS);
  const rowNum = findStudentRow(regNo);
  if (rowNum === -1) throw new Error(`Student not found: ${regNo}`);
  Object.entries(fieldsMap).forEach(([col, value]) => {
    sheet.getRange(rowNum, parseInt(col)).setValue(value);
  });
}

function DS_getMilestonesForStudent(regNo) {
  const sheet   = getSheet(SHEETS.MILESTONES);
  const matches = findAllRowsByValue(sheet, COL.MILESTONES.REG_NO, regNo);
  return matches.map(({ rowData }) => milestoneRowToObject(rowData))
    .sort((a, b) => a.order - b.order);
}

function DS_getAllMilestones() {
  const sheet = getSheet(SHEETS.MILESTONES);
  return getDataRows(sheet).map(r => milestoneRowToObject(r));
}

function DS_updateMilestoneStatus(regNo, milestoneName, newStatus, completionDate) {
  const sheet = getSheet(SHEETS.MILESTONES);
  const rows  = getDataRows(sheet);
  for (let i = 0; i < rows.length; i++) {
    const rn = String(rows[i][COL.MILESTONES.REG_NO - 1]).trim();
    const mn = String(rows[i][COL.MILESTONES.MILESTONE_NAME - 1]).trim();
    if (rn === String(regNo).trim() && mn === milestoneName) {
      const rowNum = i + 2;
      sheet.getRange(rowNum, COL.MILESTONES.STATUS).setValue(newStatus);
      if (completionDate) {
        sheet.getRange(rowNum, COL.MILESTONES.COMPLETION_DATE).setValue(completionDate);
      }
      if (newStatus === MILESTONE_STATUS.COMPLETED && !completionDate) {
        sheet.getRange(rowNum, COL.MILESTONES.COMPLETION_DATE).setValue(new Date());
      }
      return true;
    }
  }
  throw new Error(`Milestone row not found: ${regNo} / ${milestoneName}`);
}

function DS_updateMilestoneNotes(regNo, milestoneName, notes) {
  const sheet = getSheet(SHEETS.MILESTONES);
  const rows  = getDataRows(sheet);
  for (let i = 0; i < rows.length; i++) {
    const rn = String(rows[i][COL.MILESTONES.REG_NO - 1]).trim();
    const mn = String(rows[i][COL.MILESTONES.MILESTONE_NAME - 1]).trim();
    if (rn === String(regNo).trim() && mn === milestoneName) {
      sheet.getRange(i + 2, COL.MILESTONES.NOTES).setValue(notes);
      return true;
    }
  }
  throw new Error(`Milestone row not found: ${regNo} / ${milestoneName}`);
}

function DS_getReflectionsForStudent(regNo) {
  const sheet   = getSheet(SHEETS.REFLECTIONS);
  const matches = findAllRowsByValue(sheet, COL.REFLECTIONS.REG_NO, regNo);
  return matches.map(({ rowData }) => reflectionRowToObject(rowData))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function DS_getLatestReflection(regNo) {
  const all = DS_getReflectionsForStudent(regNo);
  return all.length > 0 ? all[0] : null;
}

function DS_appendReflection(reflectionObj) {
  const sheet = getSheet(SHEETS.REFLECTIONS);
  sheet.appendRow([
    reflectionObj.timestamp || new Date(),
    reflectionObj.regNo,
    reflectionObj.studentName,
    reflectionObj.studentEmail,
    reflectionObj.milestoneName,
    reflectionObj.reflectionText,
    reflectionObj.challenges,
    reflectionObj.supportNeeded,
    new Date(),
  ]);
}

function DS_getFeedbackForStudent(regNo) {
  const sheet   = getSheet(SHEETS.SUPERVISOR_FEEDBACK);
  const matches = findAllRowsByValue(sheet, COL.SUPERVISOR_FEEDBACK.STUDENT_REG_NO, regNo);
  return matches.map(({ rowData }) => feedbackRowToObject(rowData))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function DS_getLatestFeedback(regNo) {
  const all = DS_getFeedbackForStudent(regNo);
  return all.length > 0 ? all[0] : null;
}

function DS_appendFeedback(feedbackObj) {
  const sheet = getSheet(SHEETS.SUPERVISOR_FEEDBACK);
  sheet.appendRow([
    feedbackObj.timestamp || new Date(),
    feedbackObj.supervisorEmail,
    feedbackObj.supervisorName,
    feedbackObj.studentRegNo,
    feedbackObj.studentName,
    feedbackObj.milestoneReviewed,
    feedbackObj.comments,
    feedbackObj.concerns,
    feedbackObj.recommendations,
    new Date(),
  ]);
}

function DS_getSupervisorsWithStaleFeedback(staleDays) {
  const cutoff      = addDays(today(), -staleDays);
  const allFeedback = getDataRows(getSheet(SHEETS.SUPERVISOR_FEEDBACK));
  const allStudents = DS_getAllStudents('Active');
  const lastFeedbackMap = {};
  allFeedback.forEach(row => {
    const email = sanitizeEmail(String(row[COL.SUPERVISOR_FEEDBACK.SUPERVISOR_EMAIL - 1]));
    const ts    = row[COL.SUPERVISOR_FEEDBACK.TIMESTAMP - 1];
    if (!email) return;
    if (!lastFeedbackMap[email] || new Date(ts) > new Date(lastFeedbackMap[email])) {
      lastFeedbackMap[email] = ts;
    }
  });
  const supervisorMap = {};
  allStudents.forEach(s => {
    const email = s.supervisorEmail;
    if (!supervisorMap[email]) {
      supervisorMap[email] = { supervisorEmail: email, supervisorName: s.supervisorName, students: [] };
    }
    supervisorMap[email].students.push(s);
  });
  return Object.values(supervisorMap).filter(sup => {
    const last = lastFeedbackMap[sup.supervisorEmail];
    if (!last) return true;
    return new Date(last) < cutoff;
  });
}

function DS_getNotesForStudent(regNo) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('COORDINATOR_NOTES');
    if (!sheet) return [];
    const matches = findAllRowsByValue(sheet, 2, regNo);
    return matches.map(({ rowData }) => ({
      timestamp: rowData[0],
      regNo    : rowData[1],
      noteText : rowData[2],
      category : rowData[3],
      addedBy  : rowData[4],
    })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (e) { return []; }
}

function DS_addCoordinatorNote(regNo, noteText, category) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('COORDINATOR_NOTES');
  if (!sheet) return;
  const coordinator = getConfig('COORDINATOR_NAME') || 'Coordinator';
  sheet.appendRow([new Date(), regNo, noteText, category || 'General', coordinator]);
  DS_updateStudentField(regNo, COL.STUDENTS.LAST_CONTACT, new Date());
}

function DS_logEmail(recipientEmail, recipientName, emailType, subject, status, triggeredBy) {
  const sheet = getSheet(SHEETS.EMAIL_LOG);
  sheet.appendRow([new Date(), recipientEmail, recipientName, emailType, subject, status || 'Sent', triggeredBy || 'Manual']);
}

function DS_getEmailHistoryForRecipient(email) {
  const sheet   = getSheet(SHEETS.EMAIL_LOG);
  const matches = findAllRowsByValue(sheet, COL.EMAIL_LOG.RECIPIENT_EMAIL, sanitizeEmail(email));
  return matches.map(({ rowData }) => ({
    timestamp     : rowData[COL.EMAIL_LOG.TIMESTAMP       - 1],
    recipientEmail: rowData[COL.EMAIL_LOG.RECIPIENT_EMAIL  - 1],
    recipientName : rowData[COL.EMAIL_LOG.RECIPIENT_NAME   - 1],
    emailType     : rowData[COL.EMAIL_LOG.EMAIL_TYPE       - 1],
    subject       : rowData[COL.EMAIL_LOG.SUBJECT          - 1],
    status        : rowData[COL.EMAIL_LOG.STATUS           - 1],
    triggeredBy   : rowData[COL.EMAIL_LOG.TRIGGERED_BY     - 1],
  })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function DS_getDashboardPayload() {
  const students      = DS_getAllStudents();
  const allMilestones = DS_getAllMilestones();
  const milestonesByStudent = {};
  allMilestones.forEach(m => {
    if (!milestonesByStudent[m.regNo]) milestonesByStudent[m.regNo] = [];
    milestonesByStudent[m.regNo].push(m);
  });
  const enriched = students.filter(s => s.regNo).map(s => {
    const milestones = milestonesByStudent[s.regNo] || [];
    const completed  = milestones.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
    const progress   = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;
    const currentMilestone = milestones.find(
      m => m.status === MILESTONE_STATUS.IN_PROGRESS || m.status === MILESTONE_STATUS.SUBMITTED
    ) || milestones.find(m => m.status === MILESTONE_STATUS.NOT_STARTED)
      || milestones[milestones.length - 1];
    const latestReflection = DS_getLatestReflection(s.regNo);
    const latestFeedback   = DS_getLatestFeedback(s.regNo);
    return {
      ...s, milestones, progress,
      currentMilestone  : currentMilestone ? currentMilestone.name : '—',
      lastReflectionDate: latestReflection ? formatDate(new Date(latestReflection.timestamp)) : '—',
      lastFeedbackDate  : latestFeedback   ? formatDate(new Date(latestFeedback.timestamp))   : '—',
    };
  });
  const activeStudents = enriched.filter(s => s.status === STUDENT_STATUS.ACTIVE);
  return {
    students    : enriched,
    summaryCards: {
      totalStudents          : activeStudents.length,
      atRisk                 : activeStudents.filter(s => s.riskFlag === RISK_FLAGS.AT_RISK).length,
      monitoring             : activeStudents.filter(s => s.riskFlag === RISK_FLAGS.MONITOR).length,
      missingORCID           : activeStudents.filter(s => !s.orcid).length,
      completedStudents      : enriched.filter(s => s.status === STUDENT_STATUS.COMPLETED).length,
      totalMilestonesCompleted: allMilestones.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length,
    },
    programName : getConfig('PROGRAM_NAME'),
    semester    : getConfig('CURRENT_SEMESTER'),
    lastUpdated : new Date().toISOString(),
  };
}

function DS_getStudentProfile(regNo) {
  const student = DS_getStudent(regNo);
  if (!student) return null;
  const milestones = DS_getMilestonesForStudent(regNo);
  const reflections= DS_getReflectionsForStudent(regNo);
  const feedback   = DS_getFeedbackForStudent(regNo);
  const notes      = DS_getNotesForStudent(regNo);
  const emailHistory = DS_getEmailHistoryForRecipient(student.studentEmail);
  const completed  = milestones.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
  const progress   = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;
  return { student, milestones, reflections, feedback, notes, emailHistory, progress };
}

function milestoneRowToObject(row) {
  return {
    regNo        : String(row[COL.MILESTONES.REG_NO              - 1] || '').trim(),
    studentName  : String(row[COL.MILESTONES.STUDENT_NAME        - 1] || '').trim(),
    name         : String(row[COL.MILESTONES.MILESTONE_NAME      - 1] || '').trim(),
    order        : Number(row[COL.MILESTONES.MILESTONE_ORDER     - 1] || 0),
    status       : String(row[COL.MILESTONES.STATUS              - 1] || MILESTONE_STATUS.NOT_STARTED).trim(),
    targetDate   : row[COL.MILESTONES.TARGET_DATE    - 1] || '',
    completionDate: row[COL.MILESTONES.COMPLETION_DATE - 1] || '',
    daysOverdue  : Number(row[COL.MILESTONES.DAYS_OVERDUE        - 1] || 0),
    followUp     : String(row[COL.MILESTONES.FOLLOWUP_NEEDED     - 1] || 'No').trim(),
    approved     : String(row[COL.MILESTONES.SUPERVISOR_APPROVED - 1] || 'No').trim(),
    notes        : String(row[COL.MILESTONES.NOTES               - 1] || '').trim(),
  };
}

function reflectionRowToObject(row) {
  return {
    timestamp    : row[COL.REFLECTIONS.TIMESTAMP       - 1] || '',
    regNo        : String(row[COL.REFLECTIONS.REG_NO        - 1] || '').trim(),
    studentName  : String(row[COL.REFLECTIONS.STUDENT_NAME   - 1] || '').trim(),
    studentEmail : String(row[COL.REFLECTIONS.STUDENT_EMAIL  - 1] || '').trim(),
    milestoneName: String(row[COL.REFLECTIONS.MILESTONE_NAME - 1] || '').trim(),
    reflectionText: String(row[COL.REFLECTIONS.REFLECTION_TEXT- 1] || '').trim(),
    challenges   : String(row[COL.REFLECTIONS.CHALLENGES     - 1] || '').trim(),
    supportNeeded: String(row[COL.REFLECTIONS.SUPPORT_NEEDED - 1] || '').trim(),
  };
}

function feedbackRowToObject(row) {
  return {
    timestamp        : row[COL.SUPERVISOR_FEEDBACK.TIMESTAMP           - 1] || '',
    supervisorEmail  : String(row[COL.SUPERVISOR_FEEDBACK.SUPERVISOR_EMAIL   - 1] || '').trim(),
    supervisorName   : String(row[COL.SUPERVISOR_FEEDBACK.SUPERVISOR_NAME    - 1] || '').trim(),
    studentRegNo     : String(row[COL.SUPERVISOR_FEEDBACK.STUDENT_REG_NO     - 1] || '').trim(),
    studentName      : String(row[COL.SUPERVISOR_FEEDBACK.STUDENT_NAME       - 1] || '').trim(),
    milestoneReviewed: String(row[COL.SUPERVISOR_FEEDBACK.MILESTONE_REVIEWED - 1] || '').trim(),
    comments         : String(row[COL.SUPERVISOR_FEEDBACK.COMMENTS           - 1] || '').trim(),
    concerns         : String(row[COL.SUPERVISOR_FEEDBACK.CONCERNS           - 1] || '').trim(),
    recommendations  : String(row[COL.SUPERVISOR_FEEDBACK.RECOMMENDATIONS    - 1] || '').trim(),
  };
}