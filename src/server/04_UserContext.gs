// =============================================================================
// 04_UserContext.gs — Authentication and User Context
// GMU MSc MLS Thesis Coordination System
// =============================================================================

const USERS_SHEET_NAME = 'USERS';

function UC_getUserContext() {
  const email = UC_getCurrentUserEmail();

  if (!email) {
    return UC_buildContext({ email: '', role: ROLES.ANONYMOUS, isAuthenticated: false });
  }

  const explicit = UC_lookupUserSheet(email);
  if (explicit) {
    return UC_enrichContext(explicit);
  }

  const coordinatorEmail = sanitizeEmail(getConfig('COORDINATOR_EMAIL') || '');
  if (coordinatorEmail && sanitizeEmail(email) === coordinatorEmail) {
    return UC_enrichContext({ email, role: ROLES.COORDINATOR, name: getConfig('COORDINATOR_NAME') || email });
  }

  const adminEmails = (getConfig('ADMIN_EMAILS') || '').split(',').map(e => sanitizeEmail(e.trim())).filter(Boolean);
  if (adminEmails.includes(sanitizeEmail(email))) {
    return UC_enrichContext({ email, role: ROLES.ADMIN, name: email });
  }

  const student = UC_lookupStudentByEmail(email);
  if (student) {
    return UC_buildContext({
      email,
      name           : student.studentName,
      role           : ROLES.STUDENT,
      regNo          : student.regNo,
      isAuthenticated: true,
    });
  }

  const supervisorData = UC_lookupSupervisorByEmail(email);
  if (supervisorData) {
    return UC_buildContext({
      email,
      name               : supervisorData.name,
      role               : ROLES.SUPERVISOR,
      supervisedStudents : supervisorData.studentRegNos,
      isAuthenticated    : true,
    });
  }

  const allowedDomain = getConfig('ALLOWED_DOMAIN') || '';
  const emailDomain   = email.split('@')[1] || '';
  if (allowedDomain && emailDomain !== allowedDomain) {
    return UC_buildContext({ email, role: ROLES.ANONYMOUS, isAuthenticated: false });
  }

  return UC_buildContext({ email, role: ROLES.ANONYMOUS, isAuthenticated: true });
}

function UC_getCurrentUserEmail() {
  try {
    const email = Session.getActiveUser().getEmail();
    return email ? sanitizeEmail(email) : '';
  } catch (e) {
    return '';
  }
}

function UC_getTriggerUserContext() {
  const ownerEmail = sanitizeEmail(getConfig('COORDINATOR_EMAIL') || '');
  return UC_buildContext({
    email          : ownerEmail,
    name           : getConfig('COORDINATOR_NAME') || 'System',
    role           : ROLES.COORDINATOR,
    isAuthenticated: true,
  });
}

function UC_lookupUserSheet(email) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(USERS_SHEET_NAME);
    if (!sheet) return null;
    const normalizedEmail = sanitizeEmail(email);
    const rows = getDataRows(sheet);
    for (const row of rows) {
      const rowEmail = sanitizeEmail(String(row[0] || '').trim());
      const isActive = String(row[4] || 'Yes').trim().toLowerCase() !== 'no';
      if (rowEmail === normalizedEmail && isActive) {
        return {
          email: normalizedEmail,
          role : String(row[1] || '').trim().toLowerCase(),
          name : String(row[2] || email).trim(),
        };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

function UC_lookupStudentByEmail(email) {
  try {
    const sheet = getSheet(SHEETS.STUDENTS);
    const rows  = getDataRows(sheet);
    const target = sanitizeEmail(email);
    for (const row of rows) {
      const rowEmail = sanitizeEmail(String(row[COL.STUDENTS.STUDENT_EMAIL - 1] || ''));
      if (rowEmail === target) return studentRowToObject(row);
    }
    return null;
  } catch (e) {
    return null;
  }
}

function UC_lookupSupervisorByEmail(email) {
  try {
    const sheet  = getSheet(SHEETS.STUDENTS);
    const rows   = getDataRows(sheet);
    const target = sanitizeEmail(email);
    const result = { name: '', studentRegNos: [] };
    let found = false;
    for (const row of rows) {
      const supEmail = sanitizeEmail(String(row[COL.STUDENTS.SUPERVISOR_EMAIL - 1] || ''));
      if (supEmail === target) {
        const regNo = String(row[COL.STUDENTS.REG_NO - 1] || '').trim();
        if (regNo) result.studentRegNos.push(regNo);
        if (!result.name) result.name = String(row[COL.STUDENTS.SUPERVISOR_NAME - 1] || email).trim();
        found = true;
      }
    }
    return found ? result : null;
  } catch (e) {
    return null;
  }
}

function UC_buildContext(partial) {
  return {
    email              : partial.email || '',
    name               : partial.name  || partial.email || '',
    role               : partial.role  || ROLES.ANONYMOUS,
    regNo              : partial.regNo || null,
    supervisedStudents : partial.supervisedStudents || [],
    isAuthenticated    : partial.isAuthenticated !== false,
    resolvedAt         : new Date().toISOString(),
  };
}

function UC_enrichContext(partial) {
  if (partial.role === ROLES.SUPERVISOR) {
    const supData = UC_lookupSupervisorByEmail(partial.email);
    if (supData) partial.supervisedStudents = supData.studentRegNos;
  }
  if (partial.role === ROLES.STUDENT) {
    const student = UC_lookupStudentByEmail(partial.email);
    if (student) partial.regNo = student.regNo;
  }
  return UC_buildContext({ ...partial, isAuthenticated: true });
}

function UC_getClientContext() {
  try {
    const ctx = UC_getUserContext();
    return {
      email      : ctx.email,
      name       : ctx.name,
      role       : ctx.role,
      regNo      : ctx.regNo,
      permissions: AC_getClientPermissions(ctx),
      supervised : ctx.supervisedStudents,
    };
  } catch (e) {
    return { email: '', role: ROLES.ANONYMOUS, permissions: { role: ROLES.ANONYMOUS, permissions: [] } };
  }
}