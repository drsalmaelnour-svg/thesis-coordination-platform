// =============================================================================
// 09_RiskEngine.gs — Risk Detection and Scoring Engine
// GMU MSc MLS Thesis Coordination System
// =============================================================================

const RISK_FACTORS = {
  MILESTONE_OVERDUE_SEVERE  : { code: 'MS_OVERDUE_SEVERE',  label: 'Milestone overdue > 30 days',      severity: 'HIGH',     points: 50 },
  MILESTONE_OVERDUE_MODERATE: { code: 'MS_OVERDUE_MOD',     label: 'Milestone overdue 14–30 days',     severity: 'MODERATE', points: 25 },
  MILESTONE_OVERDUE_MILD    : { code: 'MS_OVERDUE_MILD',    label: 'Milestone overdue 7–14 days',      severity: 'MODERATE', points: 12 },
  MULTIPLE_OVERDUE          : { code: 'MS_MULTI_OVERDUE',   label: 'Multiple milestones overdue',      severity: 'HIGH',     points: 20 },
  NO_REFLECTION_EVER        : { code: 'REFL_NEVER',         label: 'No reflections submitted',         severity: 'MODERATE', points: 20 },
  REFLECTION_STALE          : { code: 'REFL_STALE',         label: 'No reflection in > 30 days',       severity: 'MODERATE', points: 15 },
  NO_FEEDBACK_EVER          : { code: 'FB_NEVER',           label: 'No supervisor feedback on record', severity: 'MODERATE', points: 18 },
  FEEDBACK_STALE            : { code: 'FB_STALE',           label: 'No feedback in > 21 days',         severity: 'MODERATE', points: 12 },
  MISSING_ORCID             : { code: 'ORCID_MISSING',      label: 'ORCID not submitted',              severity: 'LOW',      points: 8  },
  INACTIVE_EXTENDED         : { code: 'INACTIVE_EXT',       label: 'No contact in > 30 days',          severity: 'HIGH',     points: 30 },
  INACTIVE_MODERATE         : { code: 'INACTIVE_MOD',       label: 'No contact in 14–30 days',         severity: 'MODERATE', points: 15 },
  NO_MILESTONES_INITIALIZED : { code: 'MS_NONE',            label: 'No milestones initialized',        severity: 'MODERATE', points: 15 },
};

const RISK_THRESHOLDS = { HIGH: 40, MODERATE: 15 };

function RE_evaluateStudent(regNo) {
  const student = DS_getStudent(regNo);
  if (!student) return RE_buildEmptyReport(regNo, 'not found');

  if (student.status === STUDENT_STATUS.COMPLETED)
    return RE_buildReport(student, [], RISK_FLAGS.COMPLETED, 0, 'DONE');
  if (student.status === STUDENT_STATUS.INACTIVE || student.status === STUDENT_STATUS.WITHDRAWN)
    return RE_buildReport(student, [], RISK_FLAGS.INACTIVE, 0, 'INACTIVE');

  const milestones  = DS_getMilestonesForStudent(regNo);
  const reflections = DS_getReflectionsForStudent(regNo);
  const feedback    = DS_getFeedbackForStudent(regNo);
  const activeFactors = [];

  if (!milestones || milestones.length === 0) {
    activeFactors.push(RISK_FACTORS.NO_MILESTONES_INITIALIZED);
  } else {
    const overdueItems = milestones.filter(m => (Number(m.daysOverdue) || 0) > 0);
    const maxOverdue   = overdueItems.reduce((max, m) => Math.max(max, Number(m.daysOverdue) || 0), 0);
    if (maxOverdue >= 30)      activeFactors.push(RISK_FACTORS.MILESTONE_OVERDUE_SEVERE);
    else if (maxOverdue >= 14) activeFactors.push(RISK_FACTORS.MILESTONE_OVERDUE_MODERATE);
    else if (maxOverdue >= 7)  activeFactors.push(RISK_FACTORS.MILESTONE_OVERDUE_MILD);
    if (overdueItems.length > 1) activeFactors.push(RISK_FACTORS.MULTIPLE_OVERDUE);
  }

  if (!reflections || reflections.length === 0) {
    const enrolled      = student.enrollmentDate ? new Date(student.enrollmentDate) : null;
    const weeksEnrolled = enrolled ? daysBetween(enrolled, today()) / 7 : 0;
    if (weeksEnrolled > 4) activeFactors.push(RISK_FACTORS.NO_REFLECTION_EVER);
  } else {
    const daysSince = daysBetween(new Date(reflections[0].timestamp), today());
    if (daysSince > 30) activeFactors.push(RISK_FACTORS.REFLECTION_STALE);
  }

  if (!feedback || feedback.length === 0) {
    const enrolled      = student.enrollmentDate ? new Date(student.enrollmentDate) : null;
    const weeksEnrolled = enrolled ? daysBetween(enrolled, today()) / 7 : 0;
    if (weeksEnrolled > 6) activeFactors.push(RISK_FACTORS.NO_FEEDBACK_EVER);
  } else {
    const staleDays = parseInt(getConfig('FEEDBACK_STALE_DAYS')) || 21;
    if (daysBetween(new Date(feedback[0].timestamp), today()) > staleDays) {
      activeFactors.push(RISK_FACTORS.FEEDBACK_STALE);
    }
  }

  if (!student.orcid || student.orcid.trim() === '') {
    activeFactors.push(RISK_FACTORS.MISSING_ORCID);
  }

  const lastContact = student.lastContact ? new Date(student.lastContact) : null;
  if (!lastContact) {
    if (student.enrollmentDate) activeFactors.push(RISK_FACTORS.INACTIVE_MODERATE);
  } else {
    const daysSinceContact = daysBetween(lastContact, today());
    if (daysSinceContact > 30)      activeFactors.push(RISK_FACTORS.INACTIVE_EXTENDED);
    else if (daysSinceContact > 14) activeFactors.push(RISK_FACTORS.INACTIVE_MODERATE);
  }

  const uniqueFactors = Object.values(
    activeFactors.reduce((acc, f) => { acc[f.code] = f; return acc; }, {})
  );
  const score = uniqueFactors.reduce((sum, f) => sum + f.points, 0);

  let riskLevel, riskFlag;
  if (score >= RISK_THRESHOLDS.HIGH)     { riskLevel = 'HIGH';     riskFlag = RISK_FLAGS.AT_RISK; }
  else if (score >= RISK_THRESHOLDS.MODERATE) { riskLevel = 'MODERATE'; riskFlag = RISK_FLAGS.MONITOR; }
  else                                   { riskLevel = 'LOW';      riskFlag = RISK_FLAGS.ON_TRACK; }

  return RE_buildReport(student, uniqueFactors, riskFlag, score, riskLevel);
}

function RE_runFullRiskScan() {
  const students = DS_getAllStudents('Active');
  let evaluated = 0, changed = 0, highRisk = 0;
  students.forEach(s => {
    const report = RE_evaluateStudent(s.regNo);
    evaluated++;
    if (report.riskFlag && report.riskFlag !== s.riskFlag) {
      DS_updateStudentField(s.regNo, COL.STUDENTS.RISK_FLAG, report.riskFlag);
      AL_logRiskFlagChange(s.regNo, s.riskFlag, report.riskFlag);
      changed++;
    }
    if (report.riskLevel === 'HIGH') highRisk++;
  });
  setConfig('LAST_RISK_SCAN', new Date().toLocaleString());
  log(`RE_runFullRiskScan: ${evaluated} evaluated, ${changed} changed, ${highRisk} high risk.`);
  return { evaluated, changed, highRisk };
}

function RE_getStudentRiskReport(regNo) {
  try {
    const report = RE_evaluateStudent(regNo);
    return {
      riskLevel      : report.riskLevel,
      riskFlag       : report.riskFlag,
      score          : report.score,
      factors        : report.factors.map(f => ({ label: f.label, severity: f.severity })),
      recommendations: report.recommendations,
    };
  } catch (e) {
    return { riskLevel: 'LOW', riskFlag: RISK_FLAGS.ON_TRACK, score: 0, factors: [], recommendations: [] };
  }
}

function RE_getStudentsByRiskLevel(minLevel) {
  const threshold = minLevel === 'HIGH' ? RISK_THRESHOLDS.HIGH : RISK_THRESHOLDS.MODERATE;
  const students  = DS_getAllStudents('Active');
  const result    = [];
  students.forEach(s => {
    const report = RE_evaluateStudent(s.regNo);
    if (report.score >= threshold) result.push({ student: s, report });
  });
  return result;
}

function RE_buildReport(student, factors, riskFlag, score, riskLevel) {
  return {
    regNo          : student.regNo,
    studentName    : student.studentName,
    riskLevel      : riskLevel || 'LOW',
    riskFlag,
    score          : score || 0,
    factors,
    recommendations: RE_generateRecommendations(factors, student),
    evaluatedAt    : new Date(),
  };
}

function RE_buildEmptyReport(regNo, reason) {
  return {
    regNo, riskLevel: 'LOW', riskFlag: RISK_FLAGS.ON_TRACK,
    score: 0, factors: [], recommendations: [],
    evaluatedAt: new Date(), _note: reason,
  };
}

function RE_generateRecommendations(factors, student) {
  const recs  = [];
  const codes = new Set(factors.map(f => f.code));
  if (codes.has('MS_OVERDUE_SEVERE') || codes.has('MS_MULTI_OVERDUE'))
    recs.push(`Contact ${student.studentName} immediately regarding overdue milestones.`);
  if (codes.has('MS_OVERDUE_MOD') || codes.has('MS_OVERDUE_MILD'))
    recs.push(`Send milestone reminder to ${student.studentName}.`);
  if (codes.has('REFL_NEVER') || codes.has('REFL_STALE'))
    recs.push(`Send reflection reminder to ${student.studentName}.`);
  if (codes.has('FB_NEVER') || codes.has('FB_STALE'))
    recs.push(`Request updated feedback from ${student.supervisorName}.`);
  if (codes.has('ORCID_MISSING'))
    recs.push(`Send ORCID submission request to ${student.studentName}.`);
  if (codes.has('INACTIVE_EXT'))
    recs.push(`Schedule direct contact with ${student.studentName} — extended inactivity.`);
  return recs;
}