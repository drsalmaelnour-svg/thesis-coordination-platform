// =============================================================================
// 10_FormHandler.gs — Form Submission Processing
// GMU MSc MLS Thesis Coordination System
// =============================================================================

function FH_onORCIDFormSubmit(e) {
  try {
    const responses = FH_parseFormResponse(e);
    const regNo     = FH_extractField(responses, ['Registration Number', 'RegNo', 'Student ID']);
    const orcid     = FH_extractField(responses, ['ORCID iD', 'Your ORCID iD', 'ORCID']);
    if (!regNo || !orcid) return;
    FH_processORCIDSubmission({ regNo, orcid });
  } catch (err) {
    log(`FH_onORCIDFormSubmit error: ${err.message}`, 'ERROR');
  }
}

function FH_onReflectionFormSubmit(e) {
  try {
    const responses = FH_parseFormResponse(e);
    const payload = {
      regNo         : FH_extractField(responses, ['Registration Number', 'RegNo']),
      milestoneName : FH_extractField(responses, ['Milestone', 'Milestone Name']),
      reflectionText: FH_extractField(responses, ['Reflection', 'Reflection Narrative']),
      challenges    : FH_extractField(responses, ['Challenges', 'Challenges Encountered']),
      supportNeeded : FH_extractField(responses, ['Support Needed', 'Support Required']),
      timestamp     : new Date(),
    };
    FH_processReflectionSubmission(payload);
  } catch (err) {
    log(`FH_onReflectionFormSubmit error: ${err.message}`, 'ERROR');
  }
}

function FH_onSupervisorFeedbackFormSubmit(e) {
  try {
    const responses = FH_parseFormResponse(e);
    const payload = {
      supervisorEmail  : FH_extractField(responses, ['Supervisor Email', 'Your Email']),
      studentRegNo     : FH_extractField(responses, ['Student Registration Number', 'RegNo']),
      milestoneReviewed: FH_extractField(responses, ['Milestone Reviewed', 'Milestone']),
      comments         : FH_extractField(responses, ['Feedback Comments', 'Comments']),
      concerns         : FH_extractField(responses, ['Concerns', 'Concerns or Risks']),
      recommendations  : FH_extractField(responses, ['Recommended Actions', 'Recommendations']),
      timestamp        : new Date(),
    };
    FH_processFeedbackSubmission(payload);
  } catch (err) {
    log(`FH_onSupervisorFeedbackFormSubmit error: ${err.message}`, 'ERROR');
  }
}

function FH_submitReflectionFromPortal(payload) {
  try {
    const validation = FH_validateReflection(payload);
    if (!validation.valid) return { success: false, message: validation.errors.join(' ') };

    const student = DS_getStudent(payload.regNo);
    if (!student) return { success: false, message: 'Registration number not found.' };
    if (sanitizeEmail(student.studentEmail) !== sanitizeEmail(payload.studentEmail))
      return { success: false, message: 'Email address does not match our records.' };
    if (student.status !== STUDENT_STATUS.ACTIVE)
      return { success: false, message: 'This student record is not currently active.' };

    const recent   = DS_getReflectionsForStudent(payload.regNo);
    const cutoff   = addDays(new Date(), -1);
    const duplicate = recent.find(r =>
      r.milestoneName === payload.milestoneName && new Date(r.timestamp) > cutoff
    );
    if (duplicate) return { success: false, message: 'You have already submitted a reflection for this milestone recently.' };

    return FH_processReflectionSubmission({
      regNo         : payload.regNo,
      studentName   : student.studentName,
      studentEmail  : student.studentEmail,
      milestoneName : payload.milestoneName,
      reflectionText: payload.reflectionText,
      challenges    : payload.challenges || '',
      supportNeeded : payload.supportNeeded || '',
      timestamp     : new Date(),
    });
  } catch (err) {
    log(`FH_submitReflectionFromPortal error: ${err.message}`, 'ERROR');
    return { success: false, message: 'A system error occurred. Please try again.' };
  }
}

function FH_submitFeedbackFromPortal(payload) {
  try {
    const validation = FH_validateFeedback(payload);
    if (!validation.valid) return { success: false, message: validation.errors.join(' ') };

    const student = DS_getStudent(payload.studentRegNo);
    if (!student) return { success: false, message: 'Student registration number not found.' };

    const supervisorEmail = sanitizeEmail(payload.supervisorEmail);
    const assignedEmail   = sanitizeEmail(student.supervisorEmail);
    if (supervisorEmail !== assignedEmail)
      return { success: false, message: 'You are not recorded as the supervisor for this student.' };

    return FH_processFeedbackSubmission({
      supervisorEmail  : supervisorEmail,
      supervisorName   : student.supervisorName,
      studentRegNo     : payload.studentRegNo,
      studentName      : student.studentName,
      milestoneReviewed: payload.milestoneReviewed,
      comments         : payload.comments,
      concerns         : payload.concerns || '',
      recommendations  : payload.recommendations || '',
      timestamp        : new Date(),
    });
  } catch (err) {
    log(`FH_submitFeedbackFromPortal error: ${err.message}`, 'ERROR');
    return { success: false, message: 'A system error occurred. Please try again.' };
  }
}

function FH_lookupStudentForReflection(regNo, email) {
  try {
    if (!regNo || !email) return { success: false, message: 'Please enter both your registration number and email address.' };
    const student = DS_getStudent(regNo);
    if (!student) return { success: false, message: 'Registration number not found.' };
    if (sanitizeEmail(student.studentEmail) !== sanitizeEmail(email))
      return { success: false, message: 'Email address does not match our records.' };
    if (student.status !== STUDENT_STATUS.ACTIVE)
      return { success: false, message: 'Your student record is not currently active.' };

    const milestones = DS_getMilestonesForStudent(regNo);
    return {
      success: true,
      student: {
        name          : student.studentName,
        regNo         : student.regNo,
        supervisorName: student.supervisorName,
        milestones    : milestones.map(m => ({ name: m.name, status: m.status, order: m.order })),
      },
    };
  } catch (err) {
    return { success: false, message: 'A lookup error occurred.' };
  }
}

function FH_loadSupervisorPortalData(supervisorEmail) {
  try {
    if (!supervisorEmail || !isValidEmail(supervisorEmail))
      return { success: false, message: 'Please enter a valid email address.' };

    const email    = sanitizeEmail(supervisorEmail);
    const students = DS_getAllStudents('Active').filter(s =>
      sanitizeEmail(s.supervisorEmail) === email
    );

    if (!students.length)
      return { success: false, message: 'No active students found for this email address.' };

    const enriched = students.map(s => {
      const milestones = DS_getMilestonesForStudent(s.regNo);
      const done       = milestones.filter(m => m.status === MILESTONE_STATUS.COMPLETED).length;
      const current    = milestones.find(m =>
        m.status === MILESTONE_STATUS.IN_PROGRESS || m.status === MILESTONE_STATUS.SUBMITTED
      ) || milestones.find(m => m.status === MILESTONE_STATUS.NOT_STARTED);
      return {
        regNo           : s.regNo,
        name            : s.studentName,
        email           : s.studentEmail,
        progress        : milestones.length ? Math.round((done / milestones.length) * 100) : 0,
        currentMilestone: current ? current.name : '—',
        riskFlag        : s.riskFlag,
        milestones      : milestones.map(m => ({
          name       : m.name,
          status     : m.status,
          order      : m.order,
          daysOverdue: m.daysOverdue || 0,
          targetDate : m.targetDate ? formatDate(new Date(m.targetDate)) : '',
        })),
      };
    });

    return {
      success       : true,
      supervisorName: students[0].supervisorName,
      students      : enriched,
      programName   : getConfig('PROGRAM_NAME'),
      semester      : getConfig('CURRENT_SEMESTER'),
    };
  } catch (err) {
    return { success: false, message: 'A system error occurred.' };
  }
}

function FH_processORCIDSubmission(payload) {
  const cleaned = normalizeORCID(payload.orcid);
  if (!isValidORCID(cleaned)) return { success: false, message: `Invalid ORCID format: ${payload.orcid}` };
  const rowNum = findStudentRow(payload.regNo);
  if (rowNum === -1) return { success: false, message: `Student not found: ${payload.regNo}` };
  DS_updateStudentFields(payload.regNo, {
    [COL.STUDENTS.ORCID]      : cleaned,
    [COL.STUDENTS.ORCID_DATE] : new Date(),
  });
  AL_logEvent({ action: AUDIT_ACTIONS.ORCID_SUBMITTED, targetRegNo: payload.regNo, details: cleaned });
  return { success: true, message: `ORCID saved for ${payload.regNo}` };
}

function FH_processReflectionSubmission(payload) {
  if (!payload.studentName || !payload.studentEmail) {
    const student = DS_getStudent(payload.regNo);
    if (!student) return { success: false, message: `Student not found: ${payload.regNo}` };
    payload.studentName  = student.studentName;
    payload.studentEmail = student.studentEmail;
  }
  DS_appendReflection({
    timestamp     : payload.timestamp || new Date(),
    regNo         : payload.regNo,
    studentName   : payload.studentName,
    studentEmail  : payload.studentEmail,
    milestoneName : payload.milestoneName,
    reflectionText: payload.reflectionText,
    challenges    : payload.challenges || '',
    supportNeeded : payload.supportNeeded || '',
  });
  DS_updateStudentField(payload.regNo, COL.STUDENTS.LAST_CONTACT, new Date());
  AL_logEvent({ action: AUDIT_ACTIONS.REFLECTION_SUBMITTED, targetRegNo: payload.regNo, details: payload.milestoneName });
  try {
    const student = DS_getStudent(payload.regNo);
    const newFlag = MS_calculateRiskFlag(student);
    DS_updateStudentField(payload.regNo, COL.STUDENTS.RISK_FLAG, newFlag);
  } catch (e) {}
  return { success: true, message: 'Reflection submitted successfully.' };
}

function FH_processFeedbackSubmission(payload) {
  if (!payload.supervisorName) {
    const student = DS_getStudent(payload.studentRegNo);
    if (student) payload.supervisorName = student.supervisorName;
  }
  DS_appendFeedback({
    timestamp        : payload.timestamp || new Date(),
    supervisorEmail  : payload.supervisorEmail,
    supervisorName   : payload.supervisorName || '',
    studentRegNo     : payload.studentRegNo,
    studentName      : payload.studentName || '',
    milestoneReviewed: payload.milestoneReviewed,
    comments         : payload.comments,
    concerns         : payload.concerns || '',
    recommendations  : payload.recommendations || '',
  });
  AL_logEvent({ action: AUDIT_ACTIONS.FEEDBACK_SUBMITTED, targetRegNo: payload.studentRegNo, details: payload.milestoneReviewed });
  try {
    const student = DS_getStudent(payload.studentRegNo);
    if (student) {
      const newFlag = MS_calculateRiskFlag(student);
      DS_updateStudentField(payload.studentRegNo, COL.STUDENTS.RISK_FLAG, newFlag);
    }
  } catch (e) {}
  return { success: true, message: 'Feedback submitted successfully.' };
}

function FH_validateReflection(payload) {
  const errors = [];
  if (!payload.regNo?.trim())          errors.push('Registration number is required.');
  if (!payload.milestoneName?.trim())  errors.push('Please select a milestone.');
  if (!payload.reflectionText?.trim()) errors.push('Reflection text is required.');
  if (payload.reflectionText?.trim().length < 50)
    errors.push('Reflection must be at least 50 characters.');
  return { valid: errors.length === 0, errors };
}

function FH_validateFeedback(payload) {
  const errors = [];
  if (!payload.supervisorEmail?.trim())   errors.push('Supervisor email is required.');
  if (!isValidEmail(payload.supervisorEmail)) errors.push('Please enter a valid email address.');
  if (!payload.studentRegNo?.trim())      errors.push('Student registration number is required.');
  if (!payload.milestoneReviewed?.trim()) errors.push('Please select the milestone being reviewed.');
  if (!payload.comments?.trim())          errors.push('Feedback comments are required.');
  if (payload.comments?.trim().length < 20)
    errors.push('Comments must be at least 20 characters.');
  return { valid: errors.length === 0, errors };
}

function FH_parseFormResponse(e) {
  const result = {};
  if (e && e.response) {
    const items = e.response.getItemResponses();
    items.forEach(item => {
      result[item.getItem().getTitle().trim()] = String(item.getResponse() || '').trim();
    });
  } else if (e && e.namedValues) {
    Object.keys(e.namedValues).forEach(key => {
      result[key.trim()] = String((e.namedValues[key] || [''])[0]).trim();
    });
  }
  return result;
}

function FH_extractField(responses, aliases) {
  for (const alias of aliases) {
    if (responses[alias] !== undefined && responses[alias] !== '') return responses[alias];
  }
  return '';
}