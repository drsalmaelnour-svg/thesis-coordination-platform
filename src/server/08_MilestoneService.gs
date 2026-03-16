// =============================================================================
// 08_MilestoneService.gs — Milestone Business Logic
// GMU MSc MLS Thesis Coordination System
// =============================================================================

function MS_calculateRiskFlag(student, riskDays, monitorDays) {
  if (!riskDays)    riskDays    = parseInt(getConfig('OVERDUE_RISK_DAYS'))  || 30;
  if (!monitorDays) monitorDays = parseInt(getConfig('MONITOR_RISK_DAYS'))  || 14;

  if (student.status === STUDENT_STATUS.COMPLETED)  return RISK_FLAGS.COMPLETED;
  if (student.status === STUDENT_STATUS.INACTIVE ||
      student.status === STUDENT_STATUS.WITHDRAWN)  return RISK_FLAGS.INACTIVE;

  const milestones = DS_getMilestonesForStudent(student.regNo);
  if (!milestones || milestones.length === 0) return RISK_FLAGS.ON_TRACK;

  const maxOverdue = milestones.reduce((max, m) => {
    const overdue = Number(m.daysOverdue) || 0;
    return overdue > max ? overdue : max;
  }, 0);

  if (maxOverdue >= riskDays)    return RISK_FLAGS.AT_RISK;
  if (maxOverdue >= monitorDays) return RISK_FLAGS.MONITOR;
  return RISK_FLAGS.ON_TRACK;
}

function MS_recalculateAllRiskFlags() {
  const students    = DS_getAllStudents();
  const riskDays    = parseInt(getConfig('OVERDUE_RISK_DAYS'))  || 30;
  const monitorDays = parseInt(getConfig('MONITOR_RISK_DAYS'))  || 14;
  let updated = 0;

  students.forEach(student => {
    if (!student.regNo) return;
    const newFlag = MS_calculateRiskFlag(student, riskDays, monitorDays);
    if (newFlag !== student.riskFlag) {
      DS_updateStudentField(student.regNo, COL.STUDENTS.RISK_FLAG, newFlag);
      AL_logRiskFlagChange(student.regNo, student.riskFlag, newFlag);
      updated++;
    }
  });

  showToast(`Risk flags recalculated. ${updated} flag(s) changed.`);
  return updated;
}

function flagAtRiskStudents() {
  MS_recalculateAllRiskFlags();
}

function MS_getStudentProgress(regNo) {
  const milestones = DS_getMilestonesForStudent(regNo);
  if (!milestones || milestones.length === 0) {
    return { completed: 0, total: 0, percent: 0, currentMilestone: null, overdueCount: 0 };
  }
  const completed    = milestones.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
  const total        = milestones.length;
  const percent      = Math.round((completed / total) * 100);
  const overdueCount = milestones.filter(m => (Number(m.daysOverdue) || 0) > 0).length;
  const currentMilestone = milestones.find(
    m => m.status === MILESTONE_STATUS.IN_PROGRESS || m.status === MILESTONE_STATUS.SUBMITTED
  ) || milestones.find(m => m.status === MILESTONE_STATUS.NOT_STARTED);
  return { completed, total, percent, currentMilestone, overdueCount };
}

function MS_getOverdueStudents() {
  const students = DS_getAllStudents('Active');
  const result   = [];
  students.forEach(s => {
    const milestones        = DS_getMilestonesForStudent(s.regNo);
    const overdueMilestones = milestones.filter(m => (Number(m.daysOverdue) || 0) > 0);
    if (overdueMilestones.length > 0) result.push({ student: s, overdueMilestones });
  });
  return result;
}

function MS_updateMilestoneStatus(regNo, milestoneName, newStatus, completionDate, notes) {
  DS_updateMilestoneStatus(regNo, milestoneName, newStatus, completionDate);
  if (notes) DS_updateMilestoneNotes(regNo, milestoneName, notes);
  const student = DS_getStudent(regNo);
  if (student) {
    const newFlag = MS_calculateRiskFlag(student);
    DS_updateStudentField(regNo, COL.STUDENTS.RISK_FLAG, newFlag);
  }
}

function MS_setEnrollmentDateAndRecalculateTargets(regNo, enrollmentDate) {
  const milestonesSheet = getSheet(SHEETS.MILESTONES);
  const rows = getDataRows(milestonesSheet);
  rows.forEach((row, i) => {
    const rn = String(row[COL.MILESTONES.REG_NO - 1]).trim();
    if (rn !== String(regNo).trim()) return;
    const order     = Number(row[COL.MILESTONES.MILESTONE_ORDER - 1]) - 1;
    const milestone = MILESTONES[order];
    if (!milestone) return;
    const targetDate = weeksFromDate(enrollmentDate, milestone.defaultWeeks);
    milestonesSheet.getRange(i + 2, COL.MILESTONES.TARGET_DATE).setValue(targetDate);
  });
  DS_updateStudentField(regNo, COL.STUDENTS.ENROLLMENT_DATE, enrollmentDate);
}

function buildDashboard() {
  try {
    const dashSheet = getSheet(SHEETS.DASHBOARD);
    const payload   = DS_getDashboardPayload();
    const lastRow   = dashSheet.getLastRow();
    if (lastRow > 1) {
      dashSheet.getRange(2, 1, lastRow - 1, dashSheet.getLastColumn()).clearContent();
    }
    payload.students.forEach(s => {
      const milestoneStatuses = MILESTONES.map(m => {
        const found = s.milestones.find(sm => sm.name === m.name);
        return found ? found.status : MILESTONE_STATUS.NOT_STARTED;
      });
      dashSheet.appendRow([
        s.regNo, s.studentName, s.studentEmail, s.orcid || '',
        s.supervisorName, s.supervisorEmail, s.coSupervisor,
        ...milestoneStatuses,
        s.progress + '%',
        s.lastReflectionDate, s.lastFeedbackDate,
        s.lastContact ? formatDate(new Date(s.lastContact)) : '',
        s.nextFollowup ? formatDate(new Date(s.nextFollowup)) : '',
        s.riskFlag,
        formatDate(new Date()),
      ]);
    });
    MS_applyRiskFlagColors(dashSheet);
    setConfig('LAST_DASHBOARD_BUILD', new Date().toLocaleString());
    showToast(`Dashboard rebuilt: ${payload.students.length} students.`);
  } catch (e) {
    log('buildDashboard error: ' + e.message, 'ERROR');
    showToast('Dashboard rebuild failed: ' + e.message);
  }
}

function MS_applyRiskFlagColors(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const riskCol    = COL.DASHBOARD.RISK_FLAG;
  const riskValues = sheet.getRange(2, riskCol, lastRow - 1, 1).getValues();
  const colorMap   = {
    [RISK_FLAGS.AT_RISK]  : '#fde8e8',
    [RISK_FLAGS.MONITOR]  : '#fef3cd',
    [RISK_FLAGS.ON_TRACK] : '#e8f5e9',
    [RISK_FLAGS.COMPLETED]: '#e3f2fd',
    [RISK_FLAGS.INACTIVE] : '#f5f5f5',
  };
  riskValues.forEach((row, i) => {
    const color = colorMap[row[0]] || '#ffffff';
    sheet.getRange(i + 2, riskCol).setBackground(color);
  });
}