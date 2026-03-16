// =============================================================================
// 12_ReportService.gs — Reporting Engine
// GMU MSc MLS Thesis Coordination System
// =============================================================================

function RS_generateStudentProgressReport(regNo) {
  const student = DS_getStudent(regNo);
  if (!student) return null;
  const milestones   = DS_getMilestonesForStudent(regNo);
  const reflections  = DS_getReflectionsForStudent(regNo);
  const feedback     = DS_getFeedbackForStudent(regNo);
  const notes        = DS_getNotesForStudent(regNo);
  const emails       = DS_getEmailHistoryForRecipient(student.studentEmail);
  const riskReport   = RE_getStudentRiskReport(regNo);
  const done         = milestones.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
  const pct          = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : 0;
  const overdue      = milestones.filter(m => (Number(m.daysOverdue) || 0) > 0);
  const currentMilestone = milestones.find(
    m => m.status === MILESTONE_STATUS.IN_PROGRESS || m.status === MILESTONE_STATUS.SUBMITTED
  ) || milestones.find(m => m.status === MILESTONE_STATUS.NOT_STARTED);

  return {
    generatedAt: new Date().toISOString(),
    student: {
      regNo          : student.regNo,
      name           : student.studentName,
      email          : student.studentEmail,
      supervisorName : student.supervisorName,
      supervisorEmail: student.supervisorEmail,
      coSupervisor   : student.coSupervisor || '',
      orcid          : student.orcid || '',
      enrollmentDate : student.enrollmentDate ? formatDate(new Date(student.enrollmentDate)) : '',
      status         : student.status,
    },
    progress: {
      percent             : pct,
      milestonesCompleted : done,
      milestonesTotal     : milestones.length,
      currentMilestone    : currentMilestone ? currentMilestone.name : '—',
      overdueCount        : overdue.length,
      overdueItems        : overdue.map(m => ({ name: m.name, daysOverdue: m.daysOverdue })),
    },
    milestones: milestones.map(m => ({
      name          : m.name,
      order         : m.order,
      status        : m.status,
      targetDate    : m.targetDate ? formatDate(new Date(m.targetDate)) : '',
      completionDate: m.completionDate ? formatDate(new Date(m.completionDate)) : '',
      daysOverdue   : m.daysOverdue || 0,
    })),
    reflections: reflections.slice(0,10).map(r => ({
      date          : formatDate(new Date(r.timestamp)),
      milestone     : r.milestoneName,
      reflection    : truncate(r.reflectionText, 300),
      challenges    : truncate(r.challenges, 200),
      supportNeeded : truncate(r.supportNeeded, 200),
    })),
    supervisorFeedback: feedback.slice(0,10).map(f => ({
      date           : formatDate(new Date(f.timestamp)),
      supervisor     : f.supervisorName,
      milestone      : f.milestoneReviewed,
      comments       : truncate(f.comments, 300),
      concerns       : truncate(f.concerns, 200),
      recommendations: truncate(f.recommendations, 200),
    })),
    coordinatorNotes: notes.slice(0,20).map(n => ({
      date    : formatDate(new Date(n.timestamp)),
      category: n.category,
      note    : truncate(n.noteText, 300),
    })),
    risk: riskReport,
    coordinatorRecommendations: riskReport.recommendations,
  };
}

function RS_generateCohortSummary() {
  const students   = DS_getAllStudents();
  const milestones = DS_getAllMilestones();
  const active     = students.filter(s => s.status === STUDENT_STATUS.ACTIVE).length;
  const completed  = students.filter(s => s.status === STUDENT_STATUS.COMPLETED).length;
  const inactive   = students.filter(s =>
    s.status === STUDENT_STATUS.INACTIVE || s.status === STUDENT_STATUS.WITHDRAWN
  ).length;
  const atRisk     = students.filter(s => s.riskFlag === RISK_FLAGS.AT_RISK).length;
  const monitoring = students.filter(s => s.riskFlag === RISK_FLAGS.MONITOR).length;
  const onTrack    = students.filter(s => s.riskFlag === RISK_FLAGS.ON_TRACK).length;
  const missingORCID = students.filter(s => !s.orcid && s.status === STUDENT_STATUS.ACTIVE).length;
  const msCompleted  = milestones.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
  const msOverdue    = milestones.filter(m => (Number(m.daysOverdue) || 0) > 0).length;

  const progressBuckets = { '0–25%':0, '26–50%':0, '51–75%':0, '76–100%':0 };
  students.filter(s => s.status === STUDENT_STATUS.ACTIVE).forEach(s => {
    const ms   = milestones.filter(m => m.regNo === s.regNo);
    const done = ms.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
    const pct  = ms.length > 0 ? (done / ms.length) * 100 : 0;
    if (pct <= 25)      progressBuckets['0–25%']++;
    else if (pct <= 50) progressBuckets['26–50%']++;
    else if (pct <= 75) progressBuckets['51–75%']++;
    else                progressBuckets['76–100%']++;
  });

  const msRates = MILESTONES.map(ms => {
    const rows = milestones.filter(m => m.name === ms.name);
    const done = rows.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
    return {
      name          : ms.name,
      completed     : done,
      total         : rows.length,
      rate          : rows.length > 0 ? Math.round((done / rows.length) * 100) : 0,
      overdue       : rows.filter(m => (Number(m.daysOverdue) || 0) > 0).length,
    };
  });

  return {
    generatedAt              : new Date().toISOString(),
    programName              : getConfig('PROGRAM_NAME'),
    institution              : getConfig('INSTITUTION'),
    semester                 : getConfig('CURRENT_SEMESTER'),
    enrollment               : { active, completed, inactive, total: students.length },
    riskDistribution         : { atRisk, monitoring, onTrack },
    milestoneStats           : { completed: msCompleted, overdue: msOverdue, total: milestones.length },
    progressDistribution     : progressBuckets,
    milestoneCompletionRates : msRates,
    missingORCID,
    generatedBy              : getConfig('COORDINATOR_NAME'),
  };
}

function RS_generateSupervisorOverview() {
  const students   = DS_getAllStudents('Active');
  const milestones = DS_getAllMilestones();
  const supervisorMap = {};
  students.forEach(s => {
    const key = s.supervisorEmail || s.supervisorName;
    if (!supervisorMap[key]) {
      supervisorMap[key] = { name: s.supervisorName, email: s.supervisorEmail, students: [] };
    }
    const ms   = milestones.filter(m => m.regNo === s.regNo);
    const done = ms.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
    const pct  = ms.length > 0 ? Math.round((done / ms.length) * 100) : 0;
    supervisorMap[key].students.push({
      regNo           : s.regNo,
      name            : s.studentName,
      progress        : pct,
      riskFlag        : s.riskFlag,
      currentMilestone: ms.find(m =>
        m.status === MILESTONE_STATUS.IN_PROGRESS || m.status === MILESTONE_STATUS.SUBMITTED
      )?.name || '—',
    });
  });
  return {
    generatedAt : new Date().toISOString(),
    supervisors : Object.values(supervisorMap).sort((a,b) => a.name.localeCompare(b.name)),
  };
}

function RS_generateInterventionList() {
  const highRisk = RE_getStudentsByRiskLevel('MODERATE');
  return {
    generatedAt : new Date().toISOString(),
    total       : highRisk.length,
    students    : highRisk
      .sort((a,b) => b.report.score - a.report.score)
      .map(({ student, report }) => ({
        regNo          : student.regNo,
        name           : student.studentName,
        supervisorName : student.supervisorName,
        riskFlag       : report.riskFlag,
        riskLevel      : report.riskLevel,
        score          : report.score,
        topFactors     : report.factors.slice(0,3).map(f => f.label),
        recommendations: report.recommendations,
      })),
  };
}

function RS_generateMilestoneCompletionMatrix() {
  const students   = DS_getAllStudents('Active');
  const milestones = DS_getAllMilestones();
  const matrix     = students.map(s => {
    const row = { regNo: s.regNo, name: s.studentName, supervisor: s.supervisorName };
    MILESTONES.forEach(ms => {
      const found = milestones.find(m => m.regNo === s.regNo && m.name === ms.name);
      row[ms.name] = found ? found.status : MILESTONE_STATUS.NOT_STARTED;
    });
    return row;
  });
  return {
    generatedAt: new Date().toISOString(),
    headers    : ['RegNo','Name','Supervisor',...MILESTONES.map(m => m.name)],
    rows       : matrix,
  };
}

function generateBulkReports() {
  try {
    const ss          = SpreadsheetApp.getActiveSpreadsheet();
    let   reportSheet = ss.getSheetByName('REPORTS');
    if (!reportSheet) reportSheet = ss.insertSheet('REPORTS');
    reportSheet.clearContents();

    const cohort    = RS_generateCohortSummary();
    const matrix    = RS_generateMilestoneCompletionMatrix();
    const intervene = RS_generateInterventionList();

    RS_writeSection(reportSheet, 'Program Overview', [
      ['Generated', new Date().toLocaleString()],
      ['Program', cohort.programName],
      ['Semester', cohort.semester],
      ['Coordinator', cohort.generatedBy],
      [],
      ['Active students', cohort.enrollment.active],
      ['Completed students', cohort.enrollment.completed],
      ['At Risk', cohort.riskDistribution.atRisk],
      ['Monitoring', cohort.riskDistribution.monitoring],
      ['On Track', cohort.riskDistribution.onTrack],
      ['Missing ORCID', cohort.missingORCID],
      ['Milestones completed', cohort.milestoneStats.completed],
      ['Milestones overdue', cohort.milestoneStats.overdue],
    ]);

    reportSheet.appendRow([]);
    RS_writeSection(reportSheet, 'Milestone Completion Matrix', [
      matrix.headers,
      ...matrix.rows.map(r => [r.regNo, r.name, r.supervisor, ...MILESTONES.map(m => r[m.name])]),
    ]);

    reportSheet.appendRow([]);
    RS_writeSection(reportSheet, `Students Requiring Intervention (${intervene.total})`, [
      ['Reg No','Name','Supervisor','Risk Level','Score','Top Factors'],
      ...intervene.students.map(s => [
        s.regNo, s.name, s.supervisorName, s.riskLevel, s.score, s.topFactors.join('; ')
      ]),
    ]);

    AL_logEvent({ action: AUDIT_ACTIONS.REPORTS_GENERATED, details: 'Bulk reports written to REPORTS sheet' });
    showToast('Reports generated in REPORTS sheet.');
  } catch (e) {
    log('generateBulkReports error: ' + e.message, 'ERROR');
    showToast('Report generation failed: ' + e.message);
  }
}

function RS_writeSection(sheet, title, rows) {
  sheet.appendRow([title]);
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow, 1, 1, 8).merge()
    .setValue(title)
    .setFontWeight('bold')
    .setFontSize(12)
    .setBackground('#0B1F3A')
    .setFontColor('#FFFFFF');
  rows.forEach(r => {
    if (!r || r.length === 0) { sheet.appendRow([]); return; }
    sheet.appendRow(r);
  });
}

function API_getCohortSummary() {
  try { return RS_generateCohortSummary(); }
  catch (e) { return { error: e.message }; }
}

function API_getInterventionList() {
  try { return RS_generateInterventionList(); }
  catch (e) { return { error: e.message }; }
}

function API_getSupervisorOverview() {
  try { return RS_generateSupervisorOverview(); }
  catch (e) { return { error: e.message }; }
}