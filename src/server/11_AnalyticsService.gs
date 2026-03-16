// =============================================================================
// 11_AnalyticsService.gs — Analytics and Trend Engine
// GMU MSc MLS Thesis Coordination System
// =============================================================================

function AN_getFullAnalyticsPayload(windowDays) {
  windowDays = windowDays || 90;
  return {
    generatedAt          : new Date().toISOString(),
    windowDays,
    cohortHealth         : AN_getCohortHealth(),
    milestoneDistribution: AN_getMilestoneDistribution(),
    riskDistribution     : AN_getRiskDistribution(),
    reflectionCompletion : AN_getReflectionCompletion(),
    feedbackCompletion   : AN_getFeedbackCompletion(),
    supervisorActivity   : AN_getSupervisorActivity(),
    progressHistogram    : AN_getProgressHistogram(),
    activitySummary      : AL_getActionSummary(windowDays),
    milestoneTimeline    : AN_getMilestoneTimeline(windowDays),
  };
}

function AN_getCohortHealth() {
  const students   = DS_getAllStudents();
  const milestones = DS_getAllMilestones();
  const active     = students.filter(s => s.status === STUDENT_STATUS.ACTIVE);
  const totalActive     = active.length;
  const atRisk          = active.filter(s => s.riskFlag === RISK_FLAGS.AT_RISK).length;
  const monitoring      = active.filter(s => s.riskFlag === RISK_FLAGS.MONITOR).length;
  const onTrack         = active.filter(s => s.riskFlag === RISK_FLAGS.ON_TRACK).length;
  const missingORCID    = active.filter(s => !s.orcid).length;
  const msCompleted     = milestones.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
  const msOverdue       = milestones.filter(m => (Number(m.daysOverdue) || 0) > 0).length;
  const msTotal         = milestones.length;
  const msCompletionRate= msTotal > 0 ? Math.round((msCompleted / msTotal) * 100) : 0;
  const progressValues  = active.map(s => {
    const ms   = milestones.filter(m => m.regNo === s.regNo);
    const done = ms.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
    return ms.length > 0 ? Math.round((done / ms.length) * 100) : 0;
  });
  const avgProgress = progressValues.length > 0
    ? Math.round(progressValues.reduce((a,b) => a+b, 0) / progressValues.length) : 0;
  return {
    totalActive, atRisk, monitoring, onTrack, missingORCID,
    msCompleted, msOverdue, msTotal, msCompletionRate, avgProgress,
    healthScore: Math.max(0, Math.round(100 - (atRisk*15) - (monitoring*5) - (msOverdue*3))),
  };
}

function AN_getMilestoneDistribution() {
  const allMilestones = DS_getAllMilestones();
  const activeRegNos  = new Set(DS_getAllStudents('Active').map(s => s.regNo));
  const active        = allMilestones.filter(m => activeRegNos.has(m.regNo));
  return MILESTONES.map(ms => {
    const rows     = active.filter(m => m.name === ms.name);
    const byStatus = {};
    Object.values(MILESTONE_STATUS).forEach(s => { byStatus[s] = 0; });
    rows.forEach(m => { byStatus[m.status] = (byStatus[m.status] || 0) + 1; });
    return {
      name          : ms.name,
      order         : ms.order,
      total         : rows.length,
      byStatus,
      overdueCount  : rows.filter(m => (Number(m.daysOverdue) || 0) > 0).length,
      completionRate: rows.length > 0
        ? Math.round((byStatus[MILESTONE_STATUS.COMPLETED] / rows.length) * 100) : 0,
    };
  });
}

function AN_getRiskDistribution() {
  const students = DS_getAllStudents('Active');
  const dist = {
    [RISK_FLAGS.AT_RISK]: 0, [RISK_FLAGS.MONITOR]: 0,
    [RISK_FLAGS.ON_TRACK]: 0, [RISK_FLAGS.COMPLETED]: 0, [RISK_FLAGS.INACTIVE]: 0,
  };
  students.forEach(s => {
    if (dist[s.riskFlag] !== undefined) dist[s.riskFlag]++;
    else dist[RISK_FLAGS.ON_TRACK]++;
  });
  const total = students.length;
  return Object.entries(dist).map(([flag, count]) => ({
    flag, count,
    percent: total > 0 ? Math.round((count / total) * 100) : 0,
  }));
}

function AN_getReflectionCompletion() {
  const activeStudents = DS_getAllStudents('Active');
  const allReflections = getDataRows(getSheet(SHEETS.REFLECTIONS));
  const submittedMap   = {};
  allReflections.forEach(r => {
    const rn = String(r[COL.REFLECTIONS.REG_NO - 1] || '').trim();
    const ms = String(r[COL.REFLECTIONS.MILESTONE_NAME - 1] || '').trim();
    if (!rn) return;
    if (!submittedMap[rn]) submittedMap[rn] = new Set();
    submittedMap[rn].add(ms);
  });
  return MILESTONES.map(ms => {
    const submitted = activeStudents.filter(s => submittedMap[s.regNo]?.has(ms.name)).length;
    const total     = activeStudents.length;
    return {
      milestoneName : ms.name, order: ms.order, submitted, total,
      completionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
      notSubmitted  : total - submitted,
    };
  });
}

function AN_getFeedbackCompletion() {
  const activeStudents = DS_getAllStudents('Active');
  const allFeedback    = getDataRows(getSheet(SHEETS.SUPERVISOR_FEEDBACK));
  const staleDays      = parseInt(getConfig('FEEDBACK_STALE_DAYS')) || 21;
  const cutoff         = addDays(today(), -staleDays);
  const lastFbMap      = {};
  allFeedback.forEach(r => {
    const regNo = String(r[COL.SUPERVISOR_FEEDBACK.STUDENT_REG_NO - 1] || '').trim();
    const ts    = r[COL.SUPERVISOR_FEEDBACK.TIMESTAMP - 1];
    if (!regNo || !ts) return;
    const date = new Date(ts);
    if (!lastFbMap[regNo] || date > lastFbMap[regNo]) lastFbMap[regNo] = date;
  });
  const withRecent    = activeStudents.filter(s => lastFbMap[s.regNo] && lastFbMap[s.regNo] >= cutoff).length;
  const withOld       = activeStudents.filter(s => lastFbMap[s.regNo] && lastFbMap[s.regNo] < cutoff).length;
  const neverReceived = activeStudents.filter(s => !lastFbMap[s.regNo]).length;
  const total         = activeStudents.length;
  const supervisorMap = {};
  activeStudents.forEach(s => {
    const key = s.supervisorEmail || s.supervisorName;
    if (!supervisorMap[key]) {
      supervisorMap[key] = { name: s.supervisorName, email: s.supervisorEmail, total: 0, recent: 0 };
    }
    supervisorMap[key].total++;
    if (lastFbMap[s.regNo] && lastFbMap[s.regNo] >= cutoff) supervisorMap[key].recent++;
  });
  return {
    summary: {
      withRecent, withOld, neverReceived, total,
      completionRate: total > 0 ? Math.round((withRecent / total) * 100) : 0,
    },
    bySupervisor: Object.values(supervisorMap).map(sv => ({
      ...sv, rate: sv.total > 0 ? Math.round((sv.recent / sv.total) * 100) : 0,
    })).sort((a,b) => a.rate - b.rate),
  };
}

function AN_getSupervisorActivity() {
  const activeStudents = DS_getAllStudents('Active');
  const allFeedback    = getDataRows(getSheet(SHEETS.SUPERVISOR_FEEDBACK));
  const fbCountMap     = {};
  allFeedback.forEach(r => {
    const email = sanitizeEmail(String(r[COL.SUPERVISOR_FEEDBACK.SUPERVISOR_EMAIL - 1] || ''));
    if (!email) return;
    fbCountMap[email] = (fbCountMap[email] || 0) + 1;
  });
  const supervisorMap = {};
  activeStudents.forEach(s => {
    const key = s.supervisorEmail;
    if (!supervisorMap[key]) {
      supervisorMap[key] = { name: s.supervisorName, email: s.supervisorEmail, studentCount: 0, feedbackCount: 0, atRiskStudents: 0 };
    }
    supervisorMap[key].studentCount++;
    supervisorMap[key].feedbackCount = fbCountMap[key] || 0;
    if (s.riskFlag === RISK_FLAGS.AT_RISK) supervisorMap[key].atRiskStudents++;
  });
  return Object.values(supervisorMap).map(sv => ({
    ...sv,
    avgFeedbackPerStudent: sv.studentCount > 0
      ? Math.round((sv.feedbackCount / sv.studentCount) * 10) / 10 : 0,
  })).sort((a,b) => b.feedbackCount - a.feedbackCount);
}

function AN_getProgressHistogram() {
  const students   = DS_getAllStudents('Active');
  const milestones = DS_getAllMilestones();
  const buckets = [
    { label:'0–14%',   min:0,  max:14,  count:0 },
    { label:'15–28%',  min:15, max:28,  count:0 },
    { label:'29–42%',  min:29, max:42,  count:0 },
    { label:'43–57%',  min:43, max:57,  count:0 },
    { label:'58–71%',  min:58, max:71,  count:0 },
    { label:'72–85%',  min:72, max:85,  count:0 },
    { label:'86–100%', min:86, max:100, count:0 },
  ];
  students.forEach(s => {
    const ms   = milestones.filter(m => m.regNo === s.regNo);
    const done = ms.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
    const pct  = ms.length > 0 ? Math.round((done / ms.length) * 100) : 0;
    const bucket = buckets.find(b => pct >= b.min && pct <= b.max);
    if (bucket) bucket.count++;
  });
  return buckets;
}

function AN_getMilestoneTimeline(windowDays) {
  windowDays   = windowDays || 90;
  const cutoff = addDays(today(), -windowDays);
  const milestones = DS_getAllMilestones();
  const recent = milestones.filter(m => {
    if (m.status !== MILESTONE_STATUS.COMPLETED) return false;
    if (!m.completionDate) return false;
    const d = new Date(m.completionDate);
    return !isNaN(d) && d >= cutoff;
  });
  const weekMap = {};
  recent.forEach(m => {
    const week = AN_toISOWeek(new Date(m.completionDate));
    weekMap[week] = (weekMap[week] || 0) + 1;
  });
  const weeks  = [];
  let   cursor = new Date(cutoff);
  while (cursor <= today()) {
    const label = AN_toISOWeek(cursor);
    if (!weeks.find(w => w.week === label)) {
      weeks.push({ week: label, count: weekMap[label] || 0 });
    }
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

function AN_toISOWeek(date) {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const year = d.getFullYear();
  const week = Math.ceil(((d - new Date(year,0,1)) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2,'0')}`;
}

function API_getAnalytics(windowDays) {
  try {
    const ctx = UC_getUserContext();
    AC_requirePermission(ctx, PERMISSIONS.VIEW_REPORTS);
    return AN_getFullAnalyticsPayload(windowDays || 90);
  } catch (e) { return { error: e.message }; }
}