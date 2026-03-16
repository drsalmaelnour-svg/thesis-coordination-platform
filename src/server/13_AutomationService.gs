// =============================================================================
// 13_AutomationService.gs — Email Engine and Scheduled Automation
// GMU MSc MLS Thesis Coordination System
// =============================================================================

function dailyReminderCheck() {
  log('dailyReminderCheck started.');
  try {
    RE_runFullRiskScan();
    AUTO_sendOverdueMilestoneReminders();
    AUTO_sendSupervisorFeedbackReminders();
    AUTO_sendMissingORCIDReminders();
    log('dailyReminderCheck completed.');
  } catch (e) {
    log('dailyReminderCheck error: ' + e.message, 'ERROR');
  }
}

function weeklyProgressSummary() {
  log('weeklyProgressSummary started.');
  try {
    AUTO_sendCoordinatorWeeklySummary();
    buildDashboard();
  } catch (e) {
    log('weeklyProgressSummary error: ' + e.message, 'ERROR');
  }
}

function AUTO_sendOverdueMilestoneReminders() {
  const intervalDays  = parseInt(getConfig('REMINDER_INTERVAL_DAYS')) || 14;
  const overdueGroups = MS_getOverdueStudents();
  let sent = 0;
  overdueGroups.forEach(({ student, overdueMilestones }) => {
    if (student.lastContact) {
      const daysSince = daysBetween(new Date(student.lastContact), today());
      if (daysSince < intervalDays) return;
    }
    const subject = `Thesis milestone update required — ${student.studentName}`;
    const body    = EMAIL_buildOverdueReminderBody(student, overdueMilestones);
    const success = EMAIL_send(student.studentEmail, subject, body);
    if (success) {
      DS_logEmail(student.studentEmail, student.studentName, 'OVERDUE_REMINDER', subject, 'Sent', 'Auto');
      DS_updateStudentField(student.regNo, COL.STUDENTS.LAST_CONTACT, new Date());
      sent++;
    }
  });
  log(`AUTO_sendOverdueMilestoneReminders: ${sent} emails sent.`);
}

function AUTO_sendSupervisorFeedbackReminders() {
  const staleDays       = parseInt(getConfig('FEEDBACK_STALE_DAYS')) || 21;
  const staleSupervisors = DS_getSupervisorsWithStaleFeedback(staleDays);
  let sent = 0;
  staleSupervisors.forEach(sup => {
    const subject = `Thesis supervision feedback requested — ${getConfig('PROGRAM_NAME')}`;
    const body    = EMAIL_buildSupervisorReminderBody(sup);
    const success = EMAIL_send(sup.supervisorEmail, subject, body);
    if (success) {
      DS_logEmail(sup.supervisorEmail, sup.supervisorName, 'SUPERVISOR_REMINDER', subject, 'Sent', 'Auto');
      sent++;
    }
  });
  log(`AUTO_sendSupervisorFeedbackReminders: ${sent} emails sent.`);
}

function AUTO_sendMissingORCIDReminders() {
  const students    = DS_getAllStudents('Active').filter(s => !s.orcid);
  const orcidFormUrl = getConfig('ORCID_FORM_URL');
  let sent = 0;
  students.forEach(s => {
    const subject = `Action required: Submit your ORCID iD — ${getConfig('PROGRAM_NAME')}`;
    const body    = EMAIL_buildORCIDRequestBody(s, orcidFormUrl);
    const success = EMAIL_send(s.studentEmail, subject, body);
    if (success) {
      DS_logEmail(s.studentEmail, s.studentName, 'ORCID_REMINDER', subject, 'Sent', 'Auto');
      sent++;
    }
  });
  log(`AUTO_sendMissingORCIDReminders: ${sent} emails sent.`);
}

function AUTO_sendCoordinatorWeeklySummary() {
  const coordinatorEmail = getConfig('COORDINATOR_EMAIL');
  if (!coordinatorEmail) return;
  const payload = DS_getDashboardPayload();
  const subject = `Weekly thesis progress summary — ${getConfig('CURRENT_SEMESTER')}`;
  const body    = EMAIL_buildWeeklySummaryBody(payload);
  const success = EMAIL_send(coordinatorEmail, subject, body);
  if (success) {
    DS_logEmail(coordinatorEmail, getConfig('COORDINATOR_NAME'), 'WEEKLY_SUMMARY', subject, 'Sent', 'Auto');
  }
}

function sendORCIDRequestsToAll() {
  const students     = DS_getAllStudents('Active').filter(s => !s.orcid);
  const orcidFormUrl = getConfig('ORCID_FORM_URL');
  let sent = 0;
  students.forEach(s => {
    const subject = `Please submit your ORCID iD — ${getConfig('PROGRAM_NAME')}`;
    const body    = EMAIL_buildORCIDRequestBody(s, orcidFormUrl);
    if (EMAIL_send(s.studentEmail, subject, body)) {
      DS_logEmail(s.studentEmail, s.studentName, 'ORCID_REQUEST', subject, 'Sent', 'Manual');
      sent++;
    }
  });
  showToast(`ORCID requests sent to ${sent} student(s).`);
}

function sendReflectionReminders() {
  const students      = DS_getAllStudents('Active');
  const reflectionUrl = getConfig('REFLECTION_FORM_URL');
  let sent = 0;
  students.forEach(s => {
    const subject = `Thesis reflection submission reminder — ${getConfig('PROGRAM_NAME')}`;
    const body    = EMAIL_buildReflectionReminderBody(s, reflectionUrl);
    if (EMAIL_send(s.studentEmail, subject, body)) {
      DS_logEmail(s.studentEmail, s.studentName, 'REFLECTION_REMINDER', subject, 'Sent', 'Manual');
      sent++;
    }
  });
  showToast(`Reflection reminders sent to ${sent} student(s).`);
}

function sendSupervisorReminders() {
  const staleDays        = parseInt(getConfig('FEEDBACK_STALE_DAYS')) || 21;
  const staleSupervisors = DS_getSupervisorsWithStaleFeedback(staleDays);
  let sent = 0;
  staleSupervisors.forEach(sup => {
    const subject = `Thesis supervision feedback requested — ${getConfig('PROGRAM_NAME')}`;
    const body    = EMAIL_buildSupervisorReminderBody(sup);
    if (EMAIL_send(sup.supervisorEmail, subject, body)) {
      DS_logEmail(sup.supervisorEmail, sup.supervisorName, 'SUPERVISOR_REMINDER', subject, 'Sent', 'Manual');
      sent++;
    }
  });
  showToast(`Supervisor reminders sent to ${sent} supervisor(s).`);
}

function AUTO_sendIndividualEmail(regNo, subject, bodyHtml) {
  const student = DS_getStudent(regNo);
  if (!student) throw new Error(`Student not found: ${regNo}`);
  const success = EMAIL_send(student.studentEmail, subject, bodyHtml);
  if (success) {
    DS_logEmail(student.studentEmail, student.studentName, 'CUSTOM', subject, 'Sent', 'Coordinator');
    DS_updateStudentField(regNo, COL.STUDENTS.LAST_CONTACT, new Date());
  }
  return success;
}

function EMAIL_send(toEmail, subject, htmlBody) {
  try {
    if (!isValidEmail(toEmail)) return false;
    GmailApp.sendEmail(toEmail, subject, '', {
      htmlBody : EMAIL_wrapInTemplate(subject, htmlBody),
      name     : getConfig('COORDINATOR_NAME') || getConfig('PROGRAM_NAME'),
      replyTo  : getConfig('COORDINATOR_EMAIL'),
    });
    AL_logEmailSent(toEmail, toEmail, subject, subject, true);
    return true;
  } catch (e) {
    log(`EMAIL_send failed to ${toEmail}: ${e.message}`, 'ERROR');
    AL_logEmailSent(toEmail, toEmail, subject, subject, false);
    return false;
  }
}

function EMAIL_wrapInTemplate(title, bodyHtml) {
  const institution = getConfig('INSTITUTION') || 'Gulf Medical University';
  const program     = getConfig('PROGRAM_NAME') || 'MSc Medical Laboratory Science';
  const coordinator = getConfig('COORDINATOR_NAME') || 'Thesis Coordinator';
  const semester    = getConfig('CURRENT_SEMESTER') || '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;margin:0;padding:0}
.wrapper{max-width:620px;margin:32px auto;background:#fff;border-radius:8px;border:1px solid #dde3ea}
.header{background:#0f2942;padding:28px 32px}
.header h1{color:#fff;margin:0;font-size:16px;font-weight:600}
.header p{color:#8fa8c4;margin:4px 0 0;font-size:13px}
.body{padding:32px;color:#1e293b;font-size:15px;line-height:1.7}
.body h2{font-size:18px;color:#0f2942;margin:0 0 16px;font-weight:600}
.body p{margin:0 0 16px}
.highlight-box{background:#f0f7ff;border-left:3px solid #0d9488;padding:14px 18px;margin:20px 0}
.btn{display:inline-block;background:#0d9488;color:#fff!important;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;font-size:14px}
.footer{background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b}
</style></head><body>
<div class="wrapper">
<div class="header"><h1>${institution}</h1><p>${program}${semester ? ' · '+semester : ''}</p></div>
<div class="body">${bodyHtml}</div>
<div class="footer"><strong>${coordinator}</strong> · Thesis Coordination<br>${institution}<br><br>
This is an automated message. Please do not reply directly to this email.</div>
</div></body></html>`;
}

function EMAIL_buildORCIDRequestBody(student, formUrl) {
  return `<h2>ORCID iD submission required</h2>
<p>Dear ${student.studentName},</p>
<p>As part of your research registration, you are required to register for an ORCID iD and submit it to the thesis coordination office.</p>
<div class="highlight-box"><strong>What is ORCID?</strong><br>ORCID is a unique persistent identifier for researchers. It is required for thesis submission.</div>
<p>1. Register at <a href="https://orcid.org/register">orcid.org/register</a> if you don't have an ORCID iD.<br>
2. Submit your ORCID iD using the link below:</p>
${formUrl ? `<p><a class="btn" href="${formUrl}">Submit your ORCID iD</a></p>` : '<p>Please contact your coordinator to submit your ORCID iD.</p>'}
<p>Please complete this within <strong>7 days</strong>.</p>`;
}

function EMAIL_buildOverdueReminderBody(student, overdueMilestones) {
  const rows = overdueMilestones.map(m =>
    `<tr><td>${m.name}</td><td>${formatDate(new Date(m.targetDate)) || '—'}</td><td style="color:#dc2626;font-weight:600">${m.daysOverdue} days</td></tr>`
  ).join('');
  return `<h2>Thesis milestone update required</h2>
<p>Dear ${student.studentName},</p>
<p>The following thesis milestones require your attention:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
<thead><tr style="background:#f1f5f9"><th style="padding:10px;text-align:left">Milestone</th><th style="padding:10px;text-align:left">Target</th><th style="padding:10px;text-align:left">Overdue by</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="highlight-box">Please update your milestone status and contact your supervisor and coordinator.</div>`;
}

function EMAIL_buildSupervisorReminderBody(sup) {
  const studentList = sup.students.map(s =>
    `<li>${s.studentName} (${s.regNo}) — ${s.riskFlag}</li>`
  ).join('');
  return `<h2>Thesis supervision feedback requested</h2>
<p>Dear ${sup.supervisorName},</p>
<p>Milestone feedback is pending for the following students:</p>
<ul>${studentList}</ul>
${getConfig('SUPERVISOR_FORM_URL') ? `<p><a class="btn" href="${getConfig('SUPERVISOR_FORM_URL')}">Submit supervisor feedback</a></p>` : ''}
<p>Regular feedback helps identify students who may need additional support.</p>`;
}

function EMAIL_buildReflectionReminderBody(student, formUrl) {
  return `<h2>Thesis reflection submission reminder</h2>
<p>Dear ${student.studentName},</p>
<p>This is a reminder to submit your periodic thesis reflection.</p>
<div class="highlight-box">Regular reflections help document your research journey and allow your supervisor and coordinator to provide timely support.</div>
${formUrl ? `<p><a class="btn" href="${formUrl}">Submit your reflection</a></p>` : '<p>Please contact your coordinator to submit your reflection.</p>'}`;
}

function EMAIL_buildWeeklySummaryBody(payload) {
  const { students, summaryCards, semester, programName } = payload;
  const atRiskList = students
    .filter(s => s.riskFlag === RISK_FLAGS.AT_RISK)
    .map(s => `<li>${s.studentName} (${s.regNo}) — ${s.currentMilestone}</li>`)
    .join('') || '<li>None this week.</li>';
  return `<h2>Weekly thesis progress summary</h2>
<p>Weekly overview for <strong>${programName}</strong>, ${semester}.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<thead><tr style="background:#f1f5f9"><th style="padding:10px;text-align:left">Metric</th><th style="padding:10px;text-align:right">Count</th></tr></thead>
<tbody>
<tr><td style="padding:10px">Active students</td><td style="padding:10px;text-align:right">${summaryCards.totalStudents}</td></tr>
<tr><td style="padding:10px">At Risk</td><td style="padding:10px;text-align:right;color:#dc2626">${summaryCards.atRisk}</td></tr>
<tr><td style="padding:10px">Monitoring</td><td style="padding:10px;text-align:right;color:#d97706">${summaryCards.monitoring}</td></tr>
<tr><td style="padding:10px">Missing ORCID</td><td style="padding:10px;text-align:right">${summaryCards.missingORCID}</td></tr>
<tr><td style="padding:10px">Milestones completed</td><td style="padding:10px;text-align:right">${summaryCards.totalMilestonesCompleted}</td></tr>
</tbody></table>
<h2 style="margin-top:24px">Students requiring attention</h2>
<ul>${atRiskList}</ul>`;
}