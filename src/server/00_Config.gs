// =============================================================================
// 00_Config.gs — System-wide constants
// GMU MSc MLS Thesis Coordination System
//
// NEVER hardcode tab names or column numbers anywhere else.
// Always reference these constants. If a column moves, fix it here once.
// =============================================================================

// -----------------------------------------------------------------------------
// Sheet tab names
// -----------------------------------------------------------------------------
const SHEETS = {
  STUDENTS          : 'STUDENTS',
  MILESTONES        : 'MILESTONES',
  REFLECTIONS       : 'REFLECTIONS',
  SUPERVISOR_FEEDBACK: 'SUPERVISOR_FEEDBACK',
  EMAIL_LOG         : 'EMAIL_LOG',
  CONFIG            : 'CONFIG',
  DASHBOARD         : 'DASHBOARD',
  CSV_IMPORT        : 'CSV_IMPORT',
};

// -----------------------------------------------------------------------------
// Column indices — 1-based (matches getRange column numbering)
// -----------------------------------------------------------------------------

const COL = {

  STUDENTS: {
    REG_NO            : 1,
    STUDENT_NAME      : 2,
    STUDENT_EMAIL     : 3,
    SUPERVISOR_NAME   : 4,
    SUPERVISOR_EMAIL  : 5,
    CO_SUPERVISOR     : 6,
    ORCID             : 7,
    ORCID_DATE        : 8,
    ENROLLMENT_DATE   : 9,
    STATUS            : 10,
    COORDINATOR_NOTES : 11,
    LAST_CONTACT      : 12,
    NEXT_FOLLOWUP     : 13,
    RISK_FLAG         : 14,
    CREATED_DATE      : 15,
  },

  MILESTONES: {
    REG_NO            : 1,
    STUDENT_NAME      : 2,
    MILESTONE_NAME    : 3,
    MILESTONE_ORDER   : 4,
    STATUS            : 5,
    TARGET_DATE       : 6,
    COMPLETION_DATE   : 7,
    DAYS_OVERDUE      : 8,
    FOLLOWUP_NEEDED   : 9,
    SUPERVISOR_APPROVED: 10,
    NOTES             : 11,
  },

  REFLECTIONS: {
    TIMESTAMP         : 1,
    REG_NO            : 2,
    STUDENT_NAME      : 3,
    STUDENT_EMAIL     : 4,
    MILESTONE_NAME    : 5,
    REFLECTION_TEXT   : 6,
    CHALLENGES        : 7,
    SUPPORT_NEEDED    : 8,
    PROCESSED_DATE    : 9,
  },

  SUPERVISOR_FEEDBACK: {
    TIMESTAMP         : 1,
    SUPERVISOR_EMAIL  : 2,
    SUPERVISOR_NAME   : 3,
    STUDENT_REG_NO    : 4,
    STUDENT_NAME      : 5,
    MILESTONE_REVIEWED: 6,
    COMMENTS          : 7,
    CONCERNS          : 8,
    RECOMMENDATIONS   : 9,
    PROCESSED_DATE    : 10,
  },

  EMAIL_LOG: {
    TIMESTAMP         : 1,
    RECIPIENT_EMAIL   : 2,
    RECIPIENT_NAME    : 3,
    EMAIL_TYPE        : 4,
    SUBJECT           : 5,
    STATUS            : 6,
    TRIGGERED_BY      : 7,
  },

  CONFIG: {
    KEY               : 1,
    VALUE             : 2,
    DESCRIPTION       : 3,
  },

  DASHBOARD: {
    REG_NO            : 1,
    STUDENT_NAME      : 2,
    STUDENT_EMAIL     : 3,
    ORCID             : 4,
    SUPERVISOR_NAME   : 5,
    SUPERVISOR_EMAIL  : 6,
    CO_SUPERVISOR     : 7,
    MS_PROPOSAL_DEV   : 8,
    MS_PROPOSAL_PRES  : 9,
    MS_IRB            : 10,
    MS_DATA_COLLECT   : 11,
    MS_DATA_ANALYSIS  : 12,
    MS_THESIS_WRITING : 13,
    MS_FINAL_DEFENSE  : 14,
    OVERALL_PROGRESS  : 15,
    LAST_REFLECTION   : 16,
    LAST_FEEDBACK     : 17,
    LAST_CONTACT      : 18,
    NEXT_FOLLOWUP     : 19,
    RISK_FLAG         : 20,
    UPDATED_AT        : 21,
  },
};

// -----------------------------------------------------------------------------
// Milestones
// -----------------------------------------------------------------------------
const MILESTONES = [
  { name: 'Proposal Development',  order: 1, defaultWeeks: 8  },
  { name: 'Proposal Presentation', order: 2, defaultWeeks: 12 },
  { name: 'IRB Submission',        order: 3, defaultWeeks: 16 },
  { name: 'Data Collection',       order: 4, defaultWeeks: 28 },
  { name: 'Data Analysis',         order: 5, defaultWeeks: 36 },
  { name: 'Thesis Writing',        order: 6, defaultWeeks: 44 },
  { name: 'Final Defense',         order: 7, defaultWeeks: 52 },
];

const MILESTONE_STATUS = {
  NOT_STARTED : 'Not Started',
  IN_PROGRESS : 'In Progress',
  SUBMITTED   : 'Submitted',
  COMPLETED   : 'Completed',
  OVERDUE     : 'Overdue',
};

const STUDENT_STATUS = {
  ACTIVE    : 'Active',
  INACTIVE  : 'Inactive',
  COMPLETED : 'Completed',
  WITHDRAWN : 'Withdrawn',
};

const RISK_FLAGS = {
  ON_TRACK  : '🟢 On Track',
  MONITOR   : '🟡 Monitor',
  AT_RISK   : '🔴 At Risk',
  COMPLETED : '✅ Completed',
  INACTIVE  : '⚫ Inactive',
};

// -----------------------------------------------------------------------------
// Default CONFIG values
// -----------------------------------------------------------------------------
const DEFAULT_CONFIG = [
  ['PROGRAM_NAME',              'MSc Medical Laboratory Science',       'Full program name'],
  ['INSTITUTION',               'Gulf Medical University',              'Institution name'],
  ['CURRENT_SEMESTER',          '',                                     'e.g. Spring 2025'],
  ['CURRENT_COHORT',            '',                                     'e.g. 2024-2025 Cohort'],
  ['COORDINATOR_EMAIL',         '',                                     'Coordinator Gmail address — REQUIRED'],
  ['COORDINATOR_NAME',          '',                                     'Coordinator full name'],
  ['ADMIN_EMAILS',              '',                                     'Comma-separated admin emails'],
  ['ALLOWED_DOMAIN',            'gmu.ac.ae',                           'Restrict portal access to this email domain'],
  ['ORCID_FORM_URL',            '',                                     'Google Form URL for ORCID collection'],
  ['REFLECTION_FORM_URL',       '',                                     'Google Form URL for student reflections'],
  ['SUPERVISOR_FORM_URL',       '',                                     'Google Form URL for supervisor feedback'],
  ['OVERDUE_RISK_DAYS',         '30',                                   'Days overdue → 🔴 At Risk'],
  ['MONITOR_RISK_DAYS',         '14',                                   'Days overdue → 🟡 Monitor'],
  ['FEEDBACK_STALE_DAYS',       '21',                                   'Days without feedback → supervisor reminder'],
  ['INACTIVITY_HIGH_DAYS',      '30',                                   'Days without contact → HIGH risk factor'],
  ['INACTIVITY_MOD_DAYS',       '14',                                   'Days without contact → MODERATE risk factor'],
  ['REMINDER_INTERVAL_DAYS',    '14',                                   'Minimum days between reminders to same student'],
  ['AUTO_RISK_SCAN_ENABLED',    'Yes',                                  'Run risk scan in daily trigger (Yes/No)'],
  ['AUTO_ORCID_REMINDER',       'Yes',                                  'Auto-send ORCID reminders (Yes/No)'],
  ['AUTO_OVERDUE_REMINDER',     'Yes',                                  'Auto-send overdue milestone reminders (Yes/No)'],
  ['AUTO_SUPERVISOR_REMINDER',  'Yes',                                  'Auto-send supervisor feedback reminders (Yes/No)'],
  ['LAST_DASHBOARD_BUILD',      '',                                     'Auto-updated by buildDashboard()'],
  ['LAST_RISK_SCAN',            '',                                     'Auto-updated by RE_runFullRiskScan()'],
  ['WEB_APP_URL',               '',                                     'Paste deployed web app URL here after deployment'],
  ['SYSTEM_VERSION',            '2.0.0',                               'Do not edit'],
];

// -----------------------------------------------------------------------------
// CONFIG VALIDATION
// -----------------------------------------------------------------------------

function CFG_validateConfig() {
  const required = ['COORDINATOR_EMAIL', 'COORDINATOR_NAME', 'CURRENT_SEMESTER', 'PROGRAM_NAME', 'INSTITUTION'];
  const missing  = required.filter(k => !getConfig(k));
  const warnings = [];

  if (!getConfig('ORCID_FORM_URL'))        warnings.push('ORCID_FORM_URL not set.');
  if (!getConfig('REFLECTION_FORM_URL'))   warnings.push('REFLECTION_FORM_URL not set.');
  if (!getConfig('SUPERVISOR_FORM_URL'))   warnings.push('SUPERVISOR_FORM_URL not set.');
  if (!getConfig('WEB_APP_URL'))           warnings.push('WEB_APP_URL not set — add after deployment.');

  const coordinatorEmail = getConfig('COORDINATOR_EMAIL');
  if (coordinatorEmail && !isValidEmail(coordinatorEmail)) {
    warnings.push(`COORDINATOR_EMAIL "${coordinatorEmail}" does not look like a valid email.`);
  }

  return { valid: missing.length === 0, missing, warnings };
}