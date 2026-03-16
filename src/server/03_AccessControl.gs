// =============================================================================
// 03_AccessControl.gs — Role-Based Access Control
// GMU MSc MLS Thesis Coordination System
// =============================================================================

const ROLES = {
  COORDINATOR: 'coordinator',
  SUPERVISOR : 'supervisor',
  STUDENT    : 'student',
  ADMIN      : 'admin',
  ANONYMOUS  : 'anonymous',
};

const PERMISSIONS = {
  VIEW_ALL_STUDENTS      : 'view_all_students',
  VIEW_OWN_STUDENTS      : 'view_own_students',
  VIEW_OWN_PROFILE       : 'view_own_profile',
  UPDATE_MILESTONE_STATUS: 'update_milestone_status',
  VIEW_ALL_MILESTONES    : 'view_all_milestones',
  SUBMIT_REFLECTION      : 'submit_reflection',
  VIEW_ALL_REFLECTIONS   : 'view_all_reflections',
  VIEW_OWN_REFLECTIONS   : 'view_own_reflections',
  SUBMIT_FEEDBACK        : 'submit_feedback',
  VIEW_ALL_FEEDBACK      : 'view_all_feedback',
  VIEW_OWN_FEEDBACK      : 'view_own_feedback',
  ADD_COORDINATOR_NOTE   : 'add_coordinator_note',
  VIEW_COORDINATOR_NOTES : 'view_coordinator_notes',
  SEND_BULK_EMAIL        : 'send_bulk_email',
  SEND_INDIVIDUAL_EMAIL  : 'send_individual_email',
  VIEW_EMAIL_LOG         : 'view_email_log',
  VIEW_REPORTS           : 'view_reports',
  GENERATE_REPORTS       : 'generate_reports',
  VIEW_SUPERVISOR_REPORT : 'view_supervisor_report',
  RUN_RISK_SCAN          : 'run_risk_scan',
  MANAGE_TRIGGERS        : 'manage_triggers',
  MANAGE_SETTINGS        : 'manage_settings',
  MANAGE_USERS           : 'manage_users',
  VIEW_AUDIT_LOG         : 'view_audit_log',
  REBUILD_DASHBOARD      : 'rebuild_dashboard',
  IMPORT_STUDENTS        : 'import_students',
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.COORDINATOR]: [
    PERMISSIONS.VIEW_ALL_STUDENTS,
    PERMISSIONS.VIEW_ALL_MILESTONES,
    PERMISSIONS.UPDATE_MILESTONE_STATUS,
    PERMISSIONS.VIEW_ALL_REFLECTIONS,
    PERMISSIONS.VIEW_ALL_FEEDBACK,
    PERMISSIONS.ADD_COORDINATOR_NOTE,
    PERMISSIONS.VIEW_COORDINATOR_NOTES,
    PERMISSIONS.SEND_BULK_EMAIL,
    PERMISSIONS.SEND_INDIVIDUAL_EMAIL,
    PERMISSIONS.VIEW_EMAIL_LOG,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.VIEW_SUPERVISOR_REPORT,
    PERMISSIONS.RUN_RISK_SCAN,
    PERMISSIONS.MANAGE_TRIGGERS,
    PERMISSIONS.REBUILD_DASHBOARD,
    PERMISSIONS.IMPORT_STUDENTS,
    PERMISSIONS.VIEW_AUDIT_LOG,
  ],
  [ROLES.SUPERVISOR]: [
    PERMISSIONS.VIEW_OWN_STUDENTS,
    PERMISSIONS.SUBMIT_FEEDBACK,
    PERMISSIONS.VIEW_OWN_FEEDBACK,
    PERMISSIONS.VIEW_OWN_REFLECTIONS,
    PERMISSIONS.VIEW_SUPERVISOR_REPORT,
  ],
  [ROLES.STUDENT]: [
    PERMISSIONS.SUBMIT_REFLECTION,
    PERMISSIONS.VIEW_OWN_REFLECTIONS,
    PERMISSIONS.VIEW_OWN_PROFILE,
  ],
  [ROLES.ANONYMOUS]: [],
};

function AC_can(userCtx, permission) {
  if (!userCtx || !userCtx.role) return false;
  const allowed = ROLE_PERMISSIONS[userCtx.role] || [];
  return allowed.includes(permission);
}

function AC_requirePermission(userCtx, permission) {
  if (!AC_can(userCtx, permission)) {
    const msg = `Permission denied: role '${userCtx?.role || 'anonymous'}' cannot '${permission}'.`;
    log(msg, 'WARN');
    AL_logEvent({
      action : 'PERMISSION_DENIED',
      details: `Attempted: ${permission}`,
      status : 'DENIED',
      userCtx,
    });
    throw new Error(msg);
  }
}

function AC_getClientPermissions(userCtx) {
  if (!userCtx) return { role: ROLES.ANONYMOUS, permissions: [], identity: null };
  const allowed = ROLE_PERMISSIONS[userCtx.role] || [];
  return {
    role       : userCtx.role,
    permissions: allowed,
    identity   : {
      email     : userCtx.email,
      name      : userCtx.name,
      regNo     : userCtx.regNo || null,
      supervised: userCtx.supervisedStudents || [],
    },
  };
}

function AC_canViewStudent(userCtx, targetRegNo) {
  if (!userCtx) return false;
  if (userCtx.role === ROLES.ADMIN || userCtx.role === ROLES.COORDINATOR) return true;
  if (userCtx.role === ROLES.SUPERVISOR) {
    return (userCtx.supervisedStudents || []).includes(targetRegNo);
  }
  if (userCtx.role === ROLES.STUDENT) {
    return userCtx.regNo === targetRegNo;
  }
  return false;
}

function AC_filterVisibleStudents(userCtx, students) {
  if (!userCtx || !students) return [];
  if (userCtx.role === ROLES.ADMIN || userCtx.role === ROLES.COORDINATOR) return students;
  if (userCtx.role === ROLES.SUPERVISOR) {
    const supervised = new Set(userCtx.supervisedStudents || []);
    return students.filter(s => supervised.has(s.regNo));
  }
  if (userCtx.role === ROLES.STUDENT) {
    return students.filter(s => s.regNo === userCtx.regNo);
  }
  return [];
}